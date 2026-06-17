import { prisma } from '@/lib/prisma';
import { toClientList } from '@/lib/serialize';
import { getBlogSlug } from '@/lib/blogSlugs';
import { getSiteUrl, toCanonicalSiteUrl } from '@/lib/siteUrl';
import {
  getDeploymentSlug,
  getProjectSlug,
} from '@/lib/contentSlugs';
import { getSeoConfig, applySitemapOverrides } from '@/lib/seoConfig';

const IS_PRODUCTION_BUILD = process.env.NEXT_PHASE === 'phase-production-build';
const ALLOW_DB_DURING_BUILD = process.env.ALLOW_DB_DURING_BUILD === 'true';
const SKIP_DB_DURING_BUILD = IS_PRODUCTION_BUILD && !ALLOW_DB_DURING_BUILD;

export const revalidate = 3600;
export const dynamic = 'force-dynamic';

function toDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getObjectIdTimestamp(objectId) {
  if (!objectId) return null;

  if (typeof objectId.getTimestamp === 'function') {
    return toDateOrNull(objectId.getTimestamp());
  }

  const idString = String(objectId);
  if (!/^[0-9a-fA-F]{24}$/.test(idString)) {
    return null;
  }

  const unixTimestamp = Number.parseInt(idString.slice(0, 8), 16);
  if (!Number.isFinite(unixTimestamp)) {
    return null;
  }

  return new Date(unixTimestamp * 1000);
}

function getDocumentLastModified(document) {
  if (!document) return null;
  return toDateOrNull(document.updatedAt)
    || toDateOrNull(document.createdAt)
    || getObjectIdTimestamp(document._id);
}

function getLatestLastModified(documents = []) {
  return documents.reduce((latest, document) => {
    const candidate = getDocumentLastModified(document);
    if (!candidate) {
      return latest;
    }

    if (!latest || candidate > latest) {
      return candidate;
    }

    return latest;
  }, null);
}

function createStaticRoutes(baseUrl, options = {}) {
  const now = new Date();
  const projectsLastModified = options.projectsLastModified || now;
  const appsLastModified = options.appsLastModified || now;
  const blogsLastModified = options.blogsLastModified || now;

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/about-me`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: projectsLastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/apps`,
      lastModified: appsLastModified,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/blogs`,
      lastModified: blogsLastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/github`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact-us`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}

function normalizeSitemapRoutes(routes = []) {
  const seenUrls = new Set();

  return routes.reduce((entries, route) => {
    if (!route?.url) {
      return entries;
    }

    let canonicalUrl = route.url;
    try {
      const parsedUrl = new URL(route.url);
      canonicalUrl = `${parsedUrl.origin}${parsedUrl.pathname.replace(/\/+$/, '') || ''}`;
    } catch {
      canonicalUrl = route.url.replace(/\/+$/, '');
    }

    if (seenUrls.has(canonicalUrl)) {
      return entries;
    }

    seenUrls.add(canonicalUrl);
    entries.push({
      ...route,
      url: canonicalUrl,
    });
    return entries;
  }, []);
}

export default async function sitemap() {
  const baseUrl = getSiteUrl();

  const staticRoutes = normalizeSitemapRoutes(createStaticRoutes(baseUrl));

  if (SKIP_DB_DURING_BUILD) {
    console.warn('[sitemap] Database reads skipped during production build. Returning static routes only.');
    return staticRoutes;
  }

  try {
    const [blogRows, projectRows, deploymentRows] = await Promise.all([
      prisma.blog.findMany({
        where: { published: true, noIndex: false },
        select: { id: true, title: true, slug: true, updatedAt: true, createdAt: true },
      }),
      prisma.project.findMany({
        select: { id: true, name: true, slug: true, updatedAt: true, createdAt: true },
      }),
      prisma.deployment.findMany({
        select: { id: true, name: true, slug: true, updatedAt: true, createdAt: true },
      }),
    ]);

    const blogs = toClientList('blog', blogRows);
    const projects = toClientList('project', projectRows);
    const deployments = toClientList('deployment', deploymentRows);

    const staticRoutesWithRealtimeCollections = createStaticRoutes(baseUrl, {
      blogsLastModified: getLatestLastModified(blogs) || new Date(),
      projectsLastModified: getLatestLastModified(projects) || new Date(),
      appsLastModified: getLatestLastModified(deployments) || new Date(),
    });

    const blogRoutes = blogs.map((blog) => ({
      url: toCanonicalSiteUrl(`/blogs/${getBlogSlug(blog)}`),
      lastModified: blog.updatedAt || new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

    const projectRoutes = projects.map((project) => ({
      url: toCanonicalSiteUrl(`/projects/${getProjectSlug(project)}`),
      lastModified: getDocumentLastModified(project) || new Date(),
      changeFrequency: 'monthly',
      priority: 0.75,
    }));

    const appRoutes = deployments.map((deployment) => ({
      url: toCanonicalSiteUrl(`/apps/${getDeploymentSlug(deployment)}`),
      lastModified: getDocumentLastModified(deployment) || new Date(),
      changeFrequency: 'weekly',
      priority: 0.74,
    }));

    const generated = normalizeSitemapRoutes([...staticRoutesWithRealtimeCollections, ...blogRoutes, ...projectRoutes, ...appRoutes]);

    // Apply admin sitemap overrides (extra URLs + path exclusions). Failure here
    // must never break the sitemap, so fall back to the generated list.
    try {
      const { sitemap: sitemapCfg } = await getSeoConfig();
      return applySitemapOverrides(generated, sitemapCfg, baseUrl);
    } catch (overrideError) {
      console.warn('[sitemap] override apply failed, using generated routes:', overrideError.message);
      return generated;
    }
  } catch (error) {
    console.error('Error generating sitemap:', error);
    console.warn('Database unavailable during sitemap generation. Returning static routes only.');
    return staticRoutes;
  }
}
