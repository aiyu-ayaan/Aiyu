/**
 * AI Hub sub-page registry — the single source of truth mapping each
 * DB-backed /ai section to its own crawlable detail page (`/ai/<slug>`).
 *
 * The hub (/ai) renders a capped preview of every section. When a section
 * holds more than AI_SUBPAGE_THRESHOLD items it truncates the grid and links
 * to the matching sub-page here, which renders the full catalog. Both the
 * public renderer, the [section] route, the sitemap, and the proxy read this
 * map, so slugs and thresholds live in exactly one place.
 *
 * This module is deliberately pure (no DB / no client-only imports) so it can
 * be imported from server components, client components, the edge proxy, and
 * the sitemap alike.
 */

/**
 * Default max items a section shows on the hub before it spills to its
 * sub-page. Admin-overridable per page via `config.subPageThreshold` — this is
 * only the fallback when that field is unset or invalid.
 */
export const AI_SUBPAGE_THRESHOLD = 12;

/** Hard bounds for the admin-configurable threshold. */
export const AI_SUBPAGE_THRESHOLD_MIN = 1;
export const AI_SUBPAGE_THRESHOLD_MAX = 500;

/**
 * The effective hub threshold for a page config: the admin-set
 * `subPageThreshold`, clamped to sane bounds, falling back to the default when
 * unset or non-numeric.
 */
export function resolveSubPageThreshold(config) {
    const raw = Number(config?.subPageThreshold);
    if (!Number.isFinite(raw)) return AI_SUBPAGE_THRESHOLD;
    return Math.max(AI_SUBPAGE_THRESHOLD_MIN, Math.min(AI_SUBPAGE_THRESHOLD_MAX, Math.round(raw)));
}

/**
 * Ordered list of the sections that get their own sub-page. `type` matches the
 * section's schema type; `slug` is the public URL segment (`/ai/<slug>`);
 * `noun` fills the "See all N <noun>" CTA and copy. The `stats` section has no
 * enumerable catalog, so it is intentionally absent.
 */
export const AI_SUBPAGES = [
    { type: 'skills', slug: 'skills', noun: 'skills', fallbackTitle: 'AI Skills & Specializations' },
    { type: 'recommendations', slug: 'stack', noun: 'tools', fallbackTitle: 'The Recommended Stack' },
    { type: 'credits', slug: 'free-credits', noun: 'providers', fallbackTitle: 'Free Credits & Free Tiers' },
    { type: 'prompts', slug: 'prompt-library', noun: 'prompts', fallbackTitle: 'Prompt Library' },
];

const BY_TYPE = new Map(AI_SUBPAGES.map((route) => [route.type, route]));
const BY_SLUG = new Map(AI_SUBPAGES.map((route) => [route.slug, route]));

/** Sub-page route for a section type, or null if the type has no sub-page. */
export function getSubPageByType(type) {
    return BY_TYPE.get(type) || null;
}

/** Sub-page route for a URL slug, or null if the slug is unknown. */
export function getSubPageBySlug(slug) {
    return BY_SLUG.get(slug) || null;
}

/**
 * Count the render items a section carries. Each section type stores its
 * catalog under a different key, so the shape is normalized here — this is the
 * number compared against AI_SUBPAGE_THRESHOLD.
 */
export function countSectionItems(section) {
    if (!section || typeof section !== 'object') return 0;
    const data = section.data || {};
    switch (section.type) {
        case 'skills':
            return (Array.isArray(data.categories) ? data.categories : []).reduce(
                (total, category) => total + (Array.isArray(category?.items) ? category.items.length : 0),
                0
            );
        case 'recommendations':
            return Array.isArray(data.cards) ? data.cards.length : 0;
        case 'credits':
            return Array.isArray(data.rows) ? data.rows.length : 0;
        case 'prompts':
            return Array.isArray(data.items) ? data.items.length : 0;
        default:
            return 0;
    }
}

/** True when a section has a sub-page AND spills past the hub threshold. */
export function sectionOverflowsHub(section) {
    return Boolean(getSubPageByType(section?.type)) && countSectionItems(section) > AI_SUBPAGE_THRESHOLD;
}

/**
 * Resolve the enabled, renderable section for a sub-page route from a hydrated
 * aiPage config. Returns null when the section is missing or disabled, so the
 * route can 404 instead of rendering an empty shell.
 */
export function findRenderableSection(config, type) {
    const sections = Array.isArray(config?.sections) ? config.sections : [];
    return sections.find((section) => section?.type === type && section?.enabled !== false) || null;
}
