
import dbConnect from '../../../../lib/db';
import Blog from '../../../../models/Blog';
import BlogDetailClient from '../../../components/blogs/BlogDetailClient';

async function getBlog(id) {
    try {
        await dbConnect();
        const blog = await Blog.findById(id).lean();
        if (!blog) return null;
        // Serialize the object to pass to client component
        return JSON.parse(JSON.stringify(blog));
    } catch (error) {
        console.error('Failed to fetch blog:', error);
        return null;
    }
}

export async function generateMetadata({ params }) {
    const { id } = await params;
    const blog = await getBlog(id);

    if (!blog) {
        return {
            title: 'Blog Not Found',
        };
    }

    return {
        title: `${blog.title} | Portfolio`,
        description: blog.content.substring(0, 160),
    };
}

export default async function BlogDetailPage({ params }) {
    const { id } = await params;
    const blog = await getBlog(id);

    return <BlogDetailClient blog={blog} />;
}
