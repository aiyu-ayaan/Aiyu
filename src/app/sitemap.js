import dbConnect from '@/lib/db';
import BlogModel from '@/models/Blog';
import ProjectModel from '@/models/Project';
import GalleryModel from '@/models/Gallery';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

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

  try {
    // Attempt database connection
    await dbConnect();

    // Dynamic blog routes
    const blogs = await BlogModel.find({ published: { $ne: false } }, { slug: 1, updatedAt: 1 }).lean();
    const blogRoutes = blogs.map((blog) => ({
      url: `${baseUrl}/blogs/${blog.slug}`,
      lastModified: blog.updatedAt || new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

    // Dynamic project routes
    const projects = await ProjectModel.find({}, { slug: 1, updatedAt: 1 }).lean();
    const projectRoutes = projects.map((project) => ({
      url: `${baseUrl}/projects/${project.slug}`,
      lastModified: project.updatedAt || new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    }));

    // Dynamic gallery routes (if paginated)
    const galleries = await GalleryModel.find({}, { _id: 1, updatedAt: 1 }).lean();
    const galleryRoutes = galleries.map((gallery) => ({
      url: `${baseUrl}/gallery/${gallery._id}`,
      lastModified: gallery.updatedAt || new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    }));

    return [...staticRoutes, ...blogRoutes, ...projectRoutes, ...galleryRoutes];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    console.warn('Database unavailable during sitemap generation. Returning static routes only.');
    return staticRoutes;
  }
}
