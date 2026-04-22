import BlogList from '../../components/blogs/BlogList';
import { DEFAULT_BLOG_PAGE_SIZE, getConfigData, getPublishedBlogsPage } from '@/lib/dataFetchers';
export const revalidate = 0;

function getBaseUrl() {
    const baseUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
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
    const [blogsPage, config] = await Promise.all([
        getPublishedBlogsPage({ page: 1, limit: DEFAULT_BLOG_PAGE_SIZE }),
        getConfigData(),
    ]);

    return (
        <BlogList
            initialBlogs={blogsPage.blogs}
            initialConfig={config}
            initialPagination={blogsPage.pagination}
        />
    );
}
