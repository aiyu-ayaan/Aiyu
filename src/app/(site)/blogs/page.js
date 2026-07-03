import BlogList from '../../components/blogs/BlogList';
import { getConfigData, getPublishedBlogs } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';

export const revalidate = 0;

function getBaseUrl() {
    return getSiteUrl();
}

export async function generateMetadata() {
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getBaseUrl();
    const description = 'Read my latest blogs and articles on web development and technology.';
    const ogImage = (typeof config?.ogImage === 'string' ? config.ogImage : typeof config?.ogImage?.value === 'string' && config.ogImage.value.length > 0 ? config.ogImage.value : null) || `${baseUrl}/og-image.png`;

    return {
        title: `${baseName} | Blogs`,
        description,
        keywords: ['blog', 'articles', 'web development', 'technology', 'tutorials', config?.profession || 'full stack'].join(', '),
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-snippet': -1,
                'max-image-preview': 'large',
                'max-video-preview': -1,
            },
        },
        openGraph: {
            title: `${baseName} | Blogs`,
            description,
            url: `${baseUrl}/blogs`,
            type: 'website',
            images: [{ url: ogImage, width: 1200, height: 630 }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${baseName} | Blogs`,
            description,
            images: [ogImage],
        },
        alternates: {
            canonical: `${baseUrl}/blogs`,
        },
    };
}

export default async function BlogsPage() {
    const [blogs, config] = await Promise.all([
        getPublishedBlogs(),
        getConfigData(),
    ]);

    return (
        <BlogList
            initialBlogs={blogs}
            initialConfig={config}
            initialPagination={{
                page: 1,
                limit: Array.isArray(blogs) ? blogs.length : 0,
                total: Array.isArray(blogs) ? blogs.length : 0,
                totalPages: Array.isArray(blogs) && blogs.length > 0 ? 1 : 0,
                hasMore: false,
            }}
        />
    );
}
