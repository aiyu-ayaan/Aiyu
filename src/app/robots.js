import { toCanonicalSiteUrl } from '@/lib/siteUrl';
import { getSeoConfig } from '@/lib/seoConfig';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

/** Normalize a stored rule into the shape Next's robots metadata expects. */
function toRule(rule) {
    return {
        userAgent: rule.userAgent || '*',
        allow: rule.allow && rule.allow.length ? rule.allow : '/',
        disallow: Array.isArray(rule.disallow) ? rule.disallow : [],
        ...(Number.isFinite(rule.crawlDelay) ? { crawlDelay: rule.crawlDelay } : {}),
    };
}

export default async function robots() {
    const { robots: cfg } = await getSeoConfig();
    const sitemap = [
        toCanonicalSiteUrl('/sitemap.xml'),
        ...(cfg.extraSitemaps || []).filter(Boolean),
    ];

    return {
        rules: (cfg.rules || []).map(toRule),
        sitemap: sitemap.length === 1 ? sitemap[0] : sitemap,
    };
}
