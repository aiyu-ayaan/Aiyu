/**
 * Dynamic-variable template engine for cron webhooks.
 *
 * Resolves `$model.path` placeholders (e.g. `$blogs.0.title`, `$env.TOKEN`,
 * `$time`) against live data. Extracted from cronRunner.js so the data-loading
 * logic can be (a) bounded against OOM and (b) unit-tested without pulling in
 * sharp/encryption via the runner.
 *
 * Memory safety — the previous implementation ran UNBOUNDED `findMany()` for
 * every collection placeholder, loading whole tables (incl. the heaviest text
 * columns: blog.content, contactMessage.message, cronLog.log, aiLog.*) into the
 * heap and JSON-stringifying them. The live preview re-ran this on every
 * keystroke, OOM-killing memory-capped containers. We now:
 *   1. cap every collection query with `take: rowLimit`, and
 *   2. share a short-TTL in-process cache across requests (opt-in) so the
 *      debounced preview keystrokes reuse data instead of re-querying.
 */
import { prisma } from '@/lib/prisma';
import { getSingleton, toClient, toClientList } from '@/lib/serialize';

const toInt = (value, fallback) => {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Sample size used by the live preview — enough to render a representative
// payload without dragging whole tables into memory.
export const PREVIEW_ROW_LIMIT = toInt(process.env.CRON_PREVIEW_ROWS, 20);

// Hard cap applied during real execution. Generous (a webhook may legitimately
// dump a collection) but bounded so a single job can't exhaust the heap.
// Override per-deployment with CRON_TEMPLATE_MAX_ROWS.
export const EXECUTION_ROW_LIMIT = toInt(process.env.CRON_TEMPLATE_MAX_ROWS, 500);

// Cross-request cache TTL for collection fetches (preview path only).
const CACHE_TTL_MS = toInt(process.env.CRON_TEMPLATE_CACHE_TTL_MS, 30000);

/**
 * Module-level cache shared across requests, keyed by `${model}:${rowLimit}`.
 * Survives between preview requests within one server instance so the
 * debounced URL/body/headers previews don't each re-hit the DB. Bounded by
 * (model count × rowLimit) rows for at most CACHE_TTL_MS.
 */
const collectionCache = new Map();

function cacheGet(key) {
    const entry = collectionCache.get(key);
    if (!entry) return undefined;
    if (entry.expiry < Date.now()) {
        collectionCache.delete(key);
        return undefined;
    }
    return entry.value;
}

function cacheSet(key, value) {
    collectionCache.set(key, { value, expiry: Date.now() + CACHE_TTL_MS });
}

/** Test helper — drop all cached collection data. */
export function clearTemplateCache() {
    collectionCache.clear();
}

function getValueByPath(obj, path) {
    if (!path) return obj;
    const cleanPath = path
        .replace(/\[['"]?([^'"\]]+)['"]?\]/g, '.$1')
        .replace(/^\./, '');

    const parts = cleanPath.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
    }
    return current;
}

async function resolvePlaceholder(modelName, path, cachedData, options = {}) {
    const lowerModel = modelName.toLowerCase();
    const rowLimit = options.rowLimit ?? EXECUTION_ROW_LIMIT;
    const useCache = options.useCache ?? false;

    if (lowerModel === 'time' || lowerModel === 'timestamp') {
        return new Date().toISOString();
    }
    if (lowerModel === 'date') {
        return new Date().toLocaleDateString();
    }
    if (lowerModel === 'env') {
        return getValueByPath(cachedData.env || {}, path);
    }
    if (lowerModel === 'site') {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000';
        return getValueByPath({ url: siteUrl }, path) || siteUrl;
    }
    if (lowerModel === 'device') {
        let osInfo = 'unknown';
        let arch = 'unknown';
        let nodeVersion = process.version;
        let platform = process.platform;
        try {
            const os = await import('os');
            osInfo = `${os.type()} ${os.release()}`;
            arch = os.arch();
        } catch (e) {
            // Ignore dynamic OS import errors
        }

        const deviceInfo = {
            platform,
            os: osInfo,
            arch,
            nodeVersion,
            environment: process.env.NODE_ENV || 'development'
        };

        return getValueByPath(deviceInfo, path) ?? deviceInfo;
    }

    // Collection queries are bounded with `take: rowLimit` so a placeholder can
    // never pull an entire table into memory.
    const blogsQuery = async () => toClientList('blog', await prisma.blog.findMany({ orderBy: { createdAt: 'desc' }, take: rowLimit }));
    const projectsQuery = async () => toClientList('project', await prisma.project.findMany({ orderBy: { displayOrder: 'asc' }, take: rowLimit }));
    const galleryQuery = async () => toClientList('gallery', await prisma.gallery.findMany({ orderBy: { order: 'asc' }, take: rowLimit }));
    const socialsQuery = async () => toClientList('social', await prisma.social.findMany({ take: rowLimit }));
    const messagesQuery = async () => toClientList('contactMessage', await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: rowLimit }));
    const deploymentsQuery = async () => toClientList('deployment', await prisma.deployment.findMany({ orderBy: { displayOrder: 'asc' }, take: rowLimit }));
    const cronsQuery = async () => toClientList('cron', await prisma.cron.findMany({ take: rowLimit }));

    const modelMapping = {
        blogs: { query: blogsQuery },
        blog: { query: blogsQuery },
        projects: { query: projectsQuery },
        project: { query: projectsQuery },
        gallery: { query: galleryQuery },
        config: { query: () => getSingleton(prisma, 'config') },
        about: { query: () => getSingleton(prisma, 'about') },
        ads: { query: () => getSingleton(prisma, 'ads') },
        socials: { query: socialsQuery },
        social: { query: socialsQuery },
        theme: { query: async () => toClient('theme', await prisma.theme.findFirst()) },
        themes: { query: async () => toClient('theme', await prisma.theme.findFirst()) },
        messages: { query: messagesQuery },
        message: { query: messagesQuery },
        deployments: { query: deploymentsQuery },
        deployment: { query: deploymentsQuery },
        crons: { query: cronsQuery },
        cron: { query: cronsQuery }
    };

    if (modelMapping[lowerModel]) {
        if (cachedData[lowerModel] === undefined) {
            const cacheKey = `${lowerModel}:${rowLimit}`;
            // Prefer the per-call cache, then the shared cross-request cache
            // (preview only), then hit the DB.
            let value = useCache ? cacheGet(cacheKey) : undefined;
            if (value === undefined) {
                try {
                    value = await modelMapping[lowerModel].query();
                } catch (err) {
                    console.error(`[CRON TEMPLATE ERROR] Failed to fetch model data for ${lowerModel}:`, err);
                    value = null;
                }
                if (useCache && value !== null) {
                    cacheSet(cacheKey, value);
                }
            }
            cachedData[lowerModel] = value;
        }
        return getValueByPath(cachedData[lowerModel], path);
    }

    return `$${modelName}${path}`;
}

export async function compileTemplate(templateStr, cachedData, options = {}) {
    if (typeof templateStr !== 'string') return templateStr;
    if (!templateStr.includes('$')) return templateStr;

    const singlePlaceholderMatch = templateStr.match(/^\$([a-zA-Z0-9_]+)([\.\[\]'"\-a-zA-Z0-9_]*)$/);
    if (singlePlaceholderMatch) {
        return resolvePlaceholder(singlePlaceholderMatch[1], singlePlaceholderMatch[2], cachedData, options);
    }

    const regex = /\$([a-zA-Z0-9_]+)([\.\[\]'"\-a-zA-Z0-9_]*)/g;
    let match;
    let result = templateStr;
    const matches = [];
    while ((match = regex.exec(templateStr)) !== null) {
        matches.push({
            full: match[0],
            model: match[1],
            path: match[2],
            index: match.index
        });
    }

    for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        const val = await resolvePlaceholder(m.model, m.path, cachedData, options);
        const replacement = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
        result = result.slice(0, m.index) + replacement + result.slice(m.index + m.full.length);
    }

    return result;
}

export async function compileTemplateObject(obj, cachedData, options = {}) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
        return compileTemplate(obj, cachedData, options);
    }
    if (Array.isArray(obj)) {
        const compiledArray = [];
        for (const item of obj) {
            compiledArray.push(await compileTemplateObject(item, cachedData, options));
        }
        return compiledArray;
    }
    if (typeof obj === 'object') {
        const compiledObj = {};
        for (const key of Object.keys(obj)) {
            compiledObj[key] = await compileTemplateObject(obj[key], cachedData, options);
        }
        return compiledObj;
    }
    return obj;
}
