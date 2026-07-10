import { getLayoutData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';
import { v2PublicPath } from '@/lib/siteVersion';
import { generateBreadcrumbSchema } from '@/app/schema';

const normalizePath = (value) => {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed.startsWith('/')) return '';
    const stripped = trimmed.replace(/\/+$/, '');
    return stripped || '/';
};

const prettifyNavName = (value) => {
    const cleaned = String(value || '')
        .replace(/^_+/, '')
        .replace(/[-_]+/g, ' ')
        .trim();
    if (!cleaned) return '';
    return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Resolve the display label for a route from the admin-managed header nav
 * links, so breadcrumbs follow whatever the nav is renamed to in /admin.
 * Falls back to `fallback`, then to a prettified last path segment.
 */
export function resolveNavLabel(navLinks, path, fallback) {
    const target = normalizePath(path);
    const match = (Array.isArray(navLinks) ? navLinks : []).find(
        (link) => normalizePath(link?.href) === target
    );

    const navName = prettifyNavName(match?.name);
    if (navName) return navName;
    if (fallback) return fallback;
    return prettifyNavName(target.split('/').pop()) || 'Page';
}

/**
 * Server component that emits BreadcrumbList JSON-LD for a page, e.g.
 *   <BreadcrumbSchema path="/projects" name="Projects" />
 *
 * The crumb label is resolved dynamically from the header nav config in the
 * database (cached via getLayoutData), with `name` as the fallback for pages
 * that are not in the nav. `trail` appends extra crumbs after the page crumb
 * for detail pages: trail={[{ name: post.title, path: `/blogs/${slug}` }]}.
 */
export default async function BreadcrumbSchema({ path, name, trail = [] }) {
    const { headerData, configData } = await getLayoutData();
    const siteUrl = getSiteUrl();

    const items = [
        { name: 'Home', item: siteUrl },
        {
            name: resolveNavLabel(headerData?.navLinks, path, name),
            item: `${siteUrl}${v2PublicPath(configData, normalizePath(path))}`,
        },
        ...trail
            .filter((crumb) => crumb?.name)
            .map((crumb) => ({
                name: crumb.name,
                item: `${siteUrl}${v2PublicPath(configData, normalizePath(crumb.path))}`,
            })),
    ];

    const schema = generateBreadcrumbSchema(items);

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
