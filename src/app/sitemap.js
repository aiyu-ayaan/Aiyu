import { headers } from 'next/headers';
import dbConnect from '@/lib/db';
import BlogModel from '@/models/Blog';
import ProjectModel from '@/models/Project';
import DeploymentModel from '@/models/Deployment';
import { getBlogSlug } from '@/lib/blogSlugs';
import {
  getDeploymentSlug,
  getProjectSlug,
} from '@/lib/contentSlugs';

const IS_PRODUCTION_BUILD = process.env.NEXT_PHASE === 'phase-production-build';
const ALLOW_DB_DURING_BUILD = process.env.ALLOW_DB_DURING_BUILD === 'true';
const SKIP_DB_DURING_BUILD = IS_PRODUCTION_BUILD && !ALLOW_DB_DURING_BUILD;

export const revalidate = 3600;

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

export default async function sitemap() {
  // Support both SITE_URL (user preference) and NEXT_PUBLIC_BASE_URL (existing SEO logic)
  let baseUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || '';

  // If no env var is set, dynamically detect from request headers
  if (!baseUrl) {
    try {
      const headersList = await headers();
      const host = headersList.get('host') || 'localhost:3000';
      const proto = headersList.get('x-forwarded-proto') || 'http';
      baseUrl = `${proto}://${host}`;
    } catch {
      baseUrl = 'http://localhost:3000';
    }
  }

  // Remove trailing slash if present to prevent double slashes in routes
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  const staticRoutes = createStaticRoutes(baseUrl);

  if (SKIP_DB_DURING_BUILD) {
    console.warn('[sitemap] Database reads skipped during production build. Returning static routes only.');
    return staticRoutes;
  }

  try {
    // Attempt database connection
    await dbConnect();

    const [blogs, projects, deployments] = await Promise.all([
      BlogModel.find({ published: { $ne: false }, noIndex: { $ne: true } }, { title: 1, slug: 1, updatedAt: 1, createdAt: 1 }).lean(),
      ProjectModel.find({}, { _id: 1, name: 1, slug: 1, updatedAt: 1, createdAt: 1 }).lean(),
      DeploymentModel.find({}, { _id: 1, name: 1, slug: 1, updatedAt: 1, createdAt: 1 }).lean(),
    ]);

    const staticRoutesWithRealtimeCollections = createStaticRoutes(baseUrl, {
      blogsLastModified: getLatestLastModified(blogs) || new Date(),
      projectsLastModified: getLatestLastModified(projects) || new Date(),
      appsLastModified: getLatestLastModified(deployments) || new Date(),
    });

    const blogRoutes = blogs.map((blog) => ({
      url: `${baseUrl}/blogs/${getBlogSlug(blog)}`,
      lastModified: blog.updatedAt || new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

    const projectRoutes = projects.map((project) => ({
      url: `${baseUrl}/projects/${getProjectSlug(project)}`,
      lastModified: getDocumentLastModified(project) || new Date(),
      changeFrequency: 'monthly',
      priority: 0.75,
    }));

    const appRoutes = deployments.map((deployment) => ({
      url: `${baseUrl}/apps/${getDeploymentSlug(deployment)}`,
      lastModified: getDocumentLastModified(deployment) || new Date(),
      changeFrequency: 'weekly',
      priority: 0.74,
    }));

    return [...staticRoutesWithRealtimeCollections, ...blogRoutes, ...projectRoutes, ...appRoutes];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    console.warn('Database unavailable during sitemap generation. Returning static routes only.');
    return staticRoutes;
  }
}
