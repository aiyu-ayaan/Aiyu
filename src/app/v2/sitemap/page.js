import SitemapV2 from '../../components/shared/v2/SitemapV2';
import { getPublishedBlogSlugs, getProjectsData, getDeploymentsData, getConfigData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';
import { getProjectSlug, getDeploymentSlug } from '@/lib/contentSlugs';
import { v2PublicPath } from '@/lib/siteVersion';

export const revalidate = 3600;

export async function generateMetadata() {
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    return {
        title: `${baseName} | HTML Sitemap`,
        description: `Complete HTML Sitemap of ${baseName} covering all projects, blogs, apps, and pages.`,
        robots: {
            index: false,
            follow: true,
        },
        alternates: {
            canonical: `${getSiteUrl()}${v2PublicPath(config, '/sitemap')}`,
        },
    };
}

/**
 * /v2/sitemap — the classic HTML sitemap re-cut in the v2 editorial/terminal
 * voice: ghost glyph, mono eyebrow, and index columns over hairline rules so
 * it reads like the rest of the v2 shell instead of the plain v1 list.
 */
export default async function SitemapV2Page() {
    const [blogs, projects, apps, config] = await Promise.all([
        getPublishedBlogSlugs(),
        getProjectsData(),
        getDeploymentsData(),
        getConfigData(),
    ]);

    const mainPages = [
        { name: 'Home', href: v2PublicPath(config, '') },
        { name: 'About', href: v2PublicPath(config, '/about-me') },
        { name: 'Projects', href: v2PublicPath(config, '/projects') },
        { name: 'Apps', href: v2PublicPath(config, '/apps') },
        { name: 'Blogs', href: v2PublicPath(config, '/blogs') },
        { name: 'Gallery', href: v2PublicPath(config, '/gallery') },
        { name: 'GitHub', href: v2PublicPath(config, '/github') },
        { name: 'Contact Us', href: v2PublicPath(config, '/contact-us') },
    ];

    const columns = [
        { label: '// main', accent: 'var(--accent-cyan)', items: mainPages.map((page) => ({ name: page.name, href: page.href })) },
        {
            label: '// apps',
            accent: 'var(--status-success)',
            items: (apps || []).map((app) => ({ name: app.name, href: v2PublicPath(config, `/apps/${getDeploymentSlug(app)}`) })),
        },
        {
            label: '// projects',
            accent: 'var(--accent-purple)',
            items: (projects || []).map((project) => ({ name: project.name, href: v2PublicPath(config, `/projects/${getProjectSlug(project)}`) })),
        },
        {
            label: '// writing',
            accent: 'var(--accent-orange)',
            items: (blogs || []).map((slug) => ({ name: slug.replace(/-/g, ' '), href: v2PublicPath(config, `/blogs/${slug}`) })),
        },
    ];

    const totalEntries = columns.reduce((sum, column) => sum + column.items.length, 0);

    return <SitemapV2 columns={columns} totalEntries={totalEntries} />;
}
