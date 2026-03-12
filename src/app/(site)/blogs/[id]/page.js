
import BlogDetailClient from '../../../components/blogs/BlogDetailClient';
import { getBlogById, getConfigData } from '@/lib/dataFetchers';

export async function generateMetadata({ params }) {
    const { id } = await params;
    const blog = await getBlogById(id);
    const config = await getConfigData();

    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';

    if (!blog) {
        return {
            title: `Blog Not Found | ${baseName}`,
        };
    }

    return {
        title: `${baseName} | ${blog.title}`,
        description: blog.content.substring(0, 160),
        openGraph: {
            title: blog.title,
            description: blog.content.substring(0, 160),
            // url: `/blogs/${id}`, //  // Ideally this should be an absolute URL
            siteName: baseName,
            images: blog.image ? [blog.image] : [],
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title: blog.title,
            description: blog.content.substring(0, 160),
            images: blog.image ? [blog.image] : [],
        },
    };
}

export default async function BlogDetailPage({ params }) {
    const { id } = await params;
    const blog = await getBlogById(id);

    return <BlogDetailClient blog={blog} />;
}
