import Link from 'next/link';
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

    return (
        <div className="relative overflow-hidden">
            <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32 sm:pt-40 lg:px-10">
                <div className="relative mb-14 sm:mb-20">
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-10 right-0 select-none text-[7rem] font-black leading-none tracking-tighter sm:-top-16 sm:text-[13rem]"
                        style={{
                            color: 'transparent',
                            WebkitTextStroke: '1.5px color-mix(in srgb, var(--accent-cyan) 20%, transparent)',
                            opacity: 0.8,
                        }}
                    >
                        ≡
                    </span>

                    <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: 'var(--accent-cyan)' }}>
                        ~/sitemap — the index
                    </p>
                    <h1 className="max-w-4xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl" style={{ color: 'var(--text-bright)' }}>
                        Everything, in one place.
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                        A complete overview of every public page on this site.
                    </p>
                    <p className="mt-8 font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                        {totalEntries} entries · {columns.length} sections
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-x-10 gap-y-14 md:grid-cols-2">
                    {columns.map((column) => (
                        <section key={column.label}>
                            <h2 className="mb-4 flex items-baseline gap-3 pb-3 font-mono text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--text-bright)', borderBottom: '1px solid var(--hairline)' }}>
                                <span style={{ color: column.accent }}>{column.label}</span>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {column.items.length} {column.items.length === 1 ? 'entry' : 'entries'}
                                </span>
                            </h2>
                            {column.items.length ? (
                                <ul className="space-y-2 font-mono text-sm">
                                    {column.items.map((item) => (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                className="inline-flex items-baseline gap-2 break-words underline-offset-4 transition-colors duration-200 hover:underline"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                <span style={{ color: column.accent }}>→</span>
                                                {item.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>▸ nothing here yet…</p>
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
