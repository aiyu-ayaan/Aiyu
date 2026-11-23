import BreadcrumbSchema from '../../components/shared/BreadcrumbSchema';
import { getConfigData, getPublishedBlogs } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';
import BlogsIndexView from '../../components/blogs/v2/BlogsIndexView';
import { v2PublicPath } from '@/lib/siteVersion';

export const revalidate = 0;

export async function generateMetadata() {
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Every post as a plain editorial index — fast, server-rendered, no scripts. V2 edition.';

    return {
        title: `${baseName} | Writing`,
        description,
        openGraph: {
            title: `${baseName} | Writing`,
            description,
            url: `${baseUrl}${v2PublicPath(config, '/blogs')}`,
            type: 'website',
        },
        alternates: {
            canonical: `${baseUrl}${v2PublicPath(config, '/blogs')}`,
        },
    };
}

/**
 * /v2/blogs — server data + the shared BlogsIndexView.
 */
export default async function BlogsV2Page() {
    const [blogs, config] = await Promise.all([
        getPublishedBlogs(),
        getConfigData(),
    ]);

    return (
        <>
            <BreadcrumbSchema path="/blogs" name="Blogs" />
            <BlogsIndexView blogs={blogs} config={config} />
        </>
    );
}
