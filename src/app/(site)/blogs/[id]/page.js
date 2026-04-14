import BlogDetailClient from '../../../components/blogs/BlogDetailClient';
import { getBlogById, getConfigData } from '@/lib/dataFetchers';

export const revalidate = 300;

export async function generateMetadata({ params }) {
    const { id: identifier } = await params;
    const blog = await getBlogById(identifier);
    const config = await getConfigData();

    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const blogUrl = `${baseUrl}/blogs/${blog?.slug || identifier}`;
    const description = blog?.content?.substring(0, 160) || `Read ${baseName}`;
    const ogImage = blog?.image || config?.ogImage || `${baseUrl}/og-image.png`;

    if (!blog) {
        return {
            title: `Blog Not Found | ${baseName}`,
        };
    }

    return {
        title: `${baseName} | ${blog.title}`,
        description,
        openGraph: {
            title: blog.title,
            description,
            url: blogUrl,
            siteName: baseName,
            images: [{ url: ogImage, width: 1200, height: 630 }],
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title: blog.title,
            description,
            images: [ogImage],
        },
        alternates: {
            canonical: blogUrl,
        },
    };
}

export default async function BlogDetailPage({ params }) {
    const { id: identifier } = await params;
    const blog = await getBlogById(identifier);

    return <BlogDetailClient blog={blog} />;
}
