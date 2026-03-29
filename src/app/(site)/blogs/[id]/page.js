
import dynamic from 'next/dynamic';
import { getBlogById, getConfigData } from '@/lib/dataFetchers';

const BlogDetailClient = dynamic(() => import('../../../components/blogs/BlogDetailClient'), {
    loading: () => (
        <div className="min-h-screen p-4 lg:p-8">
            <div
                className="mx-auto max-w-5xl animate-pulse rounded-3xl border"
                style={{
                    minHeight: '420px',
                    borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                    background:
                        'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 84%, transparent), color-mix(in srgb, var(--bg-secondary) 86%, transparent))',
                }}
            />
        </div>
    ),
});

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
