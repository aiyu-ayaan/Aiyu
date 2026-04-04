import { headers } from 'next/headers';
import dbConnect from '@/lib/db';
import BlogModel from '@/models/Blog';
import { backfillMissingBlogSlugs, getBlogSlug } from '@/lib/blogSlugs';

const IS_PRODUCTION_BUILD = process.env.NEXT_PHASE === 'phase-production-build';
const ALLOW_DB_DURING_BUILD = process.env.ALLOW_DB_DURING_BUILD === 'true';
const SKIP_DB_DURING_BUILD = IS_PRODUCTION_BUILD && !ALLOW_DB_DURING_BUILD;

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

  // Static routes
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/about-me`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/apps`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/blogs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/github`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact-us`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  if (SKIP_DB_DURING_BUILD) {
    console.warn('[sitemap] Database reads skipped during production build. Returning static routes only.');
    return staticRoutes;
  }

  try {
    // Attempt database connection
    await dbConnect();
    await backfillMissingBlogSlugs(BlogModel);

    // Dynamic blog routes
    const blogs = await BlogModel.find({ published: { $ne: false } }, { title: 1, slug: 1, updatedAt: 1 }).lean();
    const blogRoutes = blogs.map((blog) => ({
      url: `${baseUrl}/blogs/${getBlogSlug(blog)}`,
      lastModified: blog.updatedAt || new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

    return [...staticRoutes, ...blogRoutes];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    console.warn('Database unavailable during sitemap generation. Returning static routes only.');
    return staticRoutes;
  }
}
