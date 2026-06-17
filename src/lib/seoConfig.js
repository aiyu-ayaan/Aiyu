/**
 * SEO & Crawl config — shared source of truth for robots.txt rules, sitemap
 * overrides, and Google Indexing settings.
 *
 * The config lives in the `SeoConfig` json-blob singleton (see
 * prisma/schema.prisma + lib/serialize.js). `robots.js`, `sitemap.js`, and the
 * admin API routes all read it through `getSeoConfig()`, which falls back to
 * DEFAULT_SEO_CONFIG when the row is missing or the DB is unavailable — so
 * behavior is identical to the old hardcoded generators until an admin edits it.
 */
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import cache from '@/lib/cache';

// Mirrors the original robots.js DISALLOWED_PATHS so day-one output is unchanged.
export const DEFAULT_DISALLOW = [
    '/admin',
    '/api/admin',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/config',
    '/*.json$',
    '/*?',
    '/blog/',
    '/deployments/',
];

export const DEFAULT_SEO_CONFIG = {
    robots: {
        rules: [
            { userAgent: '*', allow: ['/'], disallow: [...DEFAULT_DISALLOW], crawlDelay: 1 },
            { userAgent: 'Googlebot', allow: ['/'], disallow: [...DEFAULT_DISALLOW], crawlDelay: 0 },
        ],
        extraSitemaps: [],
    },
    sitemap: {
        extraUrls: [],       // [{ url, changeFrequency, priority }]
        excludePaths: [],    // exact pathnames (or full URLs) to drop from sitemap
        defaultPriorities: {}, // reserved for future per-section priority overrides
    },
    indexing: {
        enabled: false,
    },
};

/** Canonicalize a URL or path to `origin + pathname` (no trailing slash). */
function canonicalize(value, baseUrl) {
    try {
        const u = new URL(value, baseUrl);
        return `${u.origin}${u.pathname.replace(/\/+$/, '') || ''}`;
    } catch {
        return String(value || '').replace(/\/+$/, '');
    }
}

/**
 * Apply admin sitemap overrides to the code-generated route list:
 *   - drop routes whose canonical URL matches any `excludePaths` entry
 *   - append `extraUrls` entries (deduped against existing routes)
 * Pure function so it can be unit-tested without a DB.
 */
export function applySitemapOverrides(routes = [], sitemapCfg = {}, baseUrl = '') {
    const excludeSet = new Set((sitemapCfg.excludePaths || []).map((p) => canonicalize(p, baseUrl)));
    const seen = new Set();
    const out = [];

    for (const route of routes) {
        if (!route?.url) continue;
        const key = canonicalize(route.url, baseUrl);
        if (excludeSet.has(key) || seen.has(key)) continue;
        seen.add(key);
        out.push(route);
    }

    for (const extra of sitemapCfg.extraUrls || []) {
        if (!extra?.url) continue;
        const key = canonicalize(extra.url, baseUrl);
        if (excludeSet.has(key) || seen.has(key)) continue;
        seen.add(key);
        out.push({
            url: key,
            lastModified: new Date(),
            changeFrequency: extra.changeFrequency || 'monthly',
            priority: typeof extra.priority === 'number' ? extra.priority : 0.5,
        });
    }

    return out;
}

const CACHE_KEY = 'db:seoconfig:singleton';
const CACHE_TTL = 60_000;

/** Deep-ish merge that keeps DEFAULT shape when stored data omits sections. */
export function mergeSeoConfig(stored = {}) {
    const data = stored && typeof stored === 'object' ? stored : {};
    return {
        robots: {
            ...DEFAULT_SEO_CONFIG.robots,
            ...(data.robots || {}),
            rules: Array.isArray(data.robots?.rules) && data.robots.rules.length
                ? data.robots.rules
                : DEFAULT_SEO_CONFIG.robots.rules,
            extraSitemaps: Array.isArray(data.robots?.extraSitemaps) ? data.robots.extraSitemaps : [],
        },
        sitemap: {
            ...DEFAULT_SEO_CONFIG.sitemap,
            ...(data.sitemap || {}),
            extraUrls: Array.isArray(data.sitemap?.extraUrls) ? data.sitemap.extraUrls : [],
            excludePaths: Array.isArray(data.sitemap?.excludePaths) ? data.sitemap.excludePaths : [],
            defaultPriorities: data.sitemap?.defaultPriorities && typeof data.sitemap.defaultPriorities === 'object'
                ? data.sitemap.defaultPriorities
                : {},
        },
        indexing: {
            ...DEFAULT_SEO_CONFIG.indexing,
            ...(data.indexing || {}),
        },
    };
}

/**
 * Read the merged SEO config (never throws — falls back to defaults). Cached so
 * robots/sitemap reads under crawl traffic don't hammer the DB.
 */
export async function getSeoConfig() {
    try {
        return await cache.getOrSet(CACHE_KEY, async () => {
            const stored = await getSingleton(prisma, 'seoConfig');
            return mergeSeoConfig(stored || {});
        }, CACHE_TTL);
    } catch (error) {
        console.warn('[seoConfig] read failed, using defaults:', error.message);
        return mergeSeoConfig({});
    }
}

/** Drop the cached SEO config after an admin mutation. */
export async function invalidateSeoConfig() {
    await cache.invalidatePrefixAsync('db:seoconfig');
}
