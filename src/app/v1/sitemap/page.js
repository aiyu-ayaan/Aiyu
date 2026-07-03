import Link from "next/link";
import { getPublishedBlogSlugs, getProjectsData, getDeploymentsData, getConfigData } from "@/lib/dataFetchers";
import { getSiteUrl } from "@/lib/siteUrl";
import { getProjectSlug, getDeploymentSlug } from "@/lib/contentSlugs";

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
            canonical: `${getSiteUrl()}/sitemap`,
        },
    };
}

export default async function SitemapPage() {
    const [blogs, projects, apps] = await Promise.all([
        getPublishedBlogSlugs(),
        getProjectsData(),
        getDeploymentsData()
    ]);

    const mainPages = [
        { name: 'Home', href: '/' },
        { name: 'Projects', href: '/projects' },
        { name: 'Apps', href: '/apps' },
        { name: 'Blogs', href: '/blogs' },
        { name: 'Gallery', href: '/gallery' },
        { name: 'GitHub', href: '/github' },
        { name: 'Contact Us', href: '/contact-us' }
    ];

    return (
        <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
            <header className="mb-12 border-b pb-8" style={{ borderColor: 'var(--border-primary)' }}>
                <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    HTML Sitemap
                </h1>
                <p className="mt-2 text-lg" style={{ color: 'var(--text-secondary)' }}>
                    A complete overview of all public pages on this site.
                </p>
            </header>

            <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
                <section>
                    <h2 className="mb-4 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Main Pages</h2>
                    <ul className="space-y-3">
                        {mainPages.map(page => (
                            <li key={page.href}>
                                <Link href={page.href} className="text-lg font-medium hover:underline" style={{ color: 'var(--accent-cyan)' }}>
                                    {page.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>

                <section>
                    <h2 className="mb-4 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Apps & Deployments</h2>
                    <ul className="space-y-2">
                        {apps?.map(app => {
                            const slug = getDeploymentSlug(app);
                            return (
                                <li key={slug}>
                                    <Link href={`/apps/${slug}`} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>
                                        {app.name}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <section>
                    <h2 className="mb-4 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Projects</h2>
                    <ul className="space-y-2">
                        {projects?.map(project => {
                            const slug = getProjectSlug(project);
                            return (
                                <li key={slug}>
                                    <Link href={`/projects/${slug}`} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>
                                        {project.name}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <section>
                    <h2 className="mb-4 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Blog Posts</h2>
                    <ul className="space-y-2 list-disc pl-5">
                        {blogs?.map(slug => (
                            <li key={slug} className="marker:text-slate-600">
                                <Link href={`/blogs/${slug}`} className="hover:underline break-words" style={{ color: 'var(--text-secondary)' }}>
                                    {slug.replace(/-/g, ' ')}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    );
}
