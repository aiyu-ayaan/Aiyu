/**
 * SEO meta-tag audit API.
 *
 *   GET /api/admin/seo/audit -> { success, summary, groups: { blogs, projects, apps, static } }
 *
 * Reads content from the DB and runs the pure issue-detection rules in
 * lib/seoAudit.js, attaching each record's public URL and admin-editor link so
 * the dashboard can deep-link straight to the fix.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { toClientList, getSingleton } from '@/lib/serialize';
import { toCanonicalSiteUrl } from '@/lib/siteUrl';
import { getBlogSlug } from '@/lib/blogSlugs';
import { getProjectSlug, getDeploymentSlug } from '@/lib/contentSlugs';
import {
    getBlogIssues,
    getProjectIssues,
    getDeploymentIssues,
    getStaticConfigIssues,
    summarizeAudit,
} from '@/lib/seoAudit';

const STATIC_PAGES = [
    { path: '/', label: 'Home' },
    { path: '/about-me', label: 'About' },
    { path: '/projects', label: 'Projects' },
    { path: '/apps', label: 'Apps' },
    { path: '/blogs', label: 'Blogs' },
    { path: '/gallery', label: 'Gallery' },
    { path: '/contact-us', label: 'Contact' },
    { path: '/github', label: 'GitHub' },
];

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [blogRows, projectRows, deploymentRows, config] = await Promise.all([
            prisma.blog.findMany({
                where: { published: true },
                select: {
                    id: true, title: true, slug: true, image: true, imageAlt: true,
                    excerpt: true, seoDescription: true, socialImage: true,
                    published: true, noIndex: true,
                },
                orderBy: { updatedAt: 'desc' },
            }),
            prisma.project.findMany({
                select: { id: true, name: true, slug: true, description: true, image: true },
                orderBy: { updatedAt: 'desc' },
            }),
            prisma.deployment.findMany({
                select: { id: true, name: true, slug: true, description: true, image: true },
                orderBy: { updatedAt: 'desc' },
            }),
            getSingleton(prisma, 'config'),
        ]);

        const blogs = toClientList('blog', blogRows).map((b) => ({
            id: b._id,
            title: b.title || 'Untitled',
            url: toCanonicalSiteUrl(`/blogs/${getBlogSlug(b)}`),
            editUrl: `/admin/blogs/${b._id}`,
            issues: getBlogIssues(b),
        }));

        const projects = toClientList('project', projectRows).map((p) => ({
            id: p._id,
            title: p.name || 'Untitled',
            url: toCanonicalSiteUrl(`/projects/${getProjectSlug(p)}`),
            editUrl: `/admin/projects/${p._id}`,
            issues: getProjectIssues(p),
        }));

        const apps = toClientList('deployment', deploymentRows).map((d) => ({
            id: d._id,
            title: d.name || 'Untitled',
            url: toCanonicalSiteUrl(`/apps/${getDeploymentSlug(d)}`),
            editUrl: `/admin/apps/${d._id}`,
            issues: getDeploymentIssues(d),
        }));

        const staticIssues = getStaticConfigIssues(config || {});
        const staticPages = STATIC_PAGES.map((page) => ({
            id: page.path,
            title: page.label,
            url: toCanonicalSiteUrl(page.path),
            editUrl: '/admin/config',
            // Site-wide config issues apply to every static page's defaults.
            issues: staticIssues,
        }));

        const all = [...blogs, ...projects, ...apps, ...staticPages];

        return NextResponse.json({
            success: true,
            summary: summarizeAudit(all),
            groups: { blogs, projects, apps, static: staticPages },
        });
    } catch (error) {
        console.error('[seo/audit] error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
