/**
 * Per-page social / Open Graph metadata — admin-managed overrides for the
 * public pages (blogs excluded; blog posts carry their own per-post social
 * fields on the Blog model).
 *
 * Stored on the `SeoConfig` json-blob singleton under a `social` key, so it
 * needs no schema change and lives beside robots/sitemap/indexing. The SEO
 * admin route only patches robots/sitemap/indexing, and upsertSingleton merges
 * shallowly, so the two never clobber each other.
 *
 *   getSocialMeta()          -> merged { defaultImage, pages } (never throws)
 *   saveSocialMeta(input)    -> normalize + persist + invalidate
 *   applySocialOverrides()   -> merge overrides into a page's generateMetadata
 */
import { prisma } from '@/lib/prisma';
import { getSingleton, upsertSingleton } from '@/lib/serialize';
import cache from '@/lib/cache';

// Public pages an admin can override social metadata for. `key` is the logical
// (version-agnostic) path each page passes to applySocialOverrides.
export const SOCIAL_PAGES = [
    { key: '/', label: 'Home', hint: 'Landing / hero page' },
    { key: '/about-me', label: 'About', hint: 'Bio & skills' },
    { key: '/projects', label: 'Projects', hint: 'Portfolio archive' },
    { key: '/apps', label: 'Apps', hint: 'Hosted apps & services' },
    { key: '/gallery', label: 'Gallery', hint: 'Photos & certificates' },
    { key: '/github', label: 'GitHub', hint: 'Repo stats' },
    { key: '/contact-us', label: 'Contact', hint: 'Get in touch' },
    { key: '/ai', label: 'AI Hub', hint: 'The /ai showcase' },
];

const PAGE_KEYS = SOCIAL_PAGES.map((p) => p.key);

export const DEFAULT_SOCIAL_META = { defaultImage: '', pages: {} };

const CACHE_KEY = 'db:socialmeta:singleton';
const CACHE_TTL = 60_000;

function cleanString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function cleanEntry(raw) {
    const e = raw && typeof raw === 'object' ? raw : {};
    return {
        title: cleanString(e.title),
        description: cleanString(e.description),
        image: cleanString(e.image),
    };
}

/** Normalize stored/submitted social data to the canonical { defaultImage, pages } shape. */
export function mergeSocialMeta(src = {}) {
    const data = src && typeof src === 'object' ? src : {};
    const inputPages = data.pages && typeof data.pages === 'object' ? data.pages : {};
    const pages = {};
    for (const key of PAGE_KEYS) {
        pages[key] = cleanEntry(inputPages[key]);
    }
    return {
        defaultImage: cleanString(data.defaultImage),
        pages,
    };
}

/**
 * Read merged social metadata (never throws — falls back to defaults). Cached
 * so per-page generateMetadata reads under crawl traffic don't hammer the DB.
 */
export async function getSocialMeta() {
    try {
        return await cache.getOrSet(CACHE_KEY, async () => {
            const stored = await getSingleton(prisma, 'seoConfig');
            return mergeSocialMeta(stored?.social || {});
        }, CACHE_TTL);
    } catch (error) {
        console.warn('[socialMeta] read failed, using defaults:', error.message);
        return mergeSocialMeta({});
    }
}

/** Normalize + persist the social block, then drop the cache. */
export async function saveSocialMeta(input) {
    const clean = mergeSocialMeta(input);
    await upsertSingleton(prisma, 'seoConfig', { social: clean });
    await cache.invalidatePrefixAsync('db:socialmeta');
    return clean;
}

function firstNonEmpty(...values) {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
}

function absoluteUrl(value, baseUrl) {
    if (!value) return '';
    try {
        return new URL(value, baseUrl || undefined).toString();
    } catch {
        return value;
    }
}

/**
 * Merge admin social overrides into a page's generateMetadata result. Preserves
 * whatever the page already set (canonical url, type, etc.) and only fills in
 * title/description/images when an override (or the global default image) exists.
 */
export function applySocialOverrides(base = {}, social, pageKey, { baseUrl = '', fallbackImage = '' } = {}) {
    const entry = social?.pages?.[pageKey] || {};
    const title = firstNonEmpty(entry.title, base.title);
    const description = firstNonEmpty(entry.description, base.description);
    const image = absoluteUrl(firstNonEmpty(entry.image, social?.defaultImage, fallbackImage), baseUrl);

    const out = { ...base };
    if (title) out.title = title;
    if (description) out.description = description;

    const baseOg = base.openGraph || {};
    out.openGraph = {
        ...baseOg,
        title: title || baseOg.title,
        description: description || baseOg.description,
        images: image ? [{ url: image, width: 1200, height: 630 }] : baseOg.images,
    };

    const baseTwitter = base.twitter || {};
    out.twitter = {
        card: 'summary_large_image',
        ...baseTwitter,
        title: title || baseTwitter.title,
        description: description || baseTwitter.description,
        images: image ? [image] : baseTwitter.images,
    };

    return out;
}
