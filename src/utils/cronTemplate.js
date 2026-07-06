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
 * keystroke, OOM-killing memory-capped containers (the VPS runs a 256 MB heap).
 * We now make every collection fetch DEMAND-DRIVEN:
 *   1. cap every collection query with `take: rowLimit` (hard ceiling), and
 *   2. shrink `take` further to the highest ROW INDEX the template references —
 *      `$blogs.0.title` fetches 1 row, not `rowLimit`; and
 *   3. project a Prisma `select` down to the COLUMNS the template references —
 *      `$blogs.0.title` loads only `{ id, title }`, so the heavy `content`
 *      column never enters the heap; and
 *   4. share a short-TTL in-process cache across requests (opt-in) so the
 *      debounced preview keystrokes reuse data instead of re-querying.
 *
 * A whole-collection reference (`$blogs`) or a whole-row reference (`$blogs.0`)
 * still loads all columns — you asked to dump everything — but stays bounded by
 * `rowLimit`. Mixed references within one compile upgrade the fetch to the
 * union of what every placeholder needs (see the per-model meta in cachedData).
 */
import { prisma } from '@/lib/prisma';
import { getModelColumns, getSingleton, toClient, toClientList } from '@/lib/serialize';

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

/** Normalize `[0]`, `['x']` bracket access into dot segments and split. */
function pathParts(path) {
    if (!path) return [];
    const cleanPath = path
        .replace(/\[['"]?([^'"\]]+)['"]?\]/g, '.$1')
        .replace(/^\./, '');
    return cleanPath === '' ? [] : cleanPath.split('.');
}

function getValueByPath(obj, path) {
    if (!path) return obj;
    let current = obj;
    for (const part of pathParts(path)) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
    }
    return current;
}

/**
 * From a placeholder path, work out how little of a collection we can fetch:
 *   - `''`            (`$blogs`)         → whole collection, all columns
 *   - `.length`/`.map`(`$blogs.length`) → whole collection, all columns
 *   - `.0`            (`$blogs.0`)       → row 0, all columns (whole row)
 *   - `.0.title`      (`$blogs.0.title`) → row 0, only the `title` column
 *
 * `index` null means "no numeric index ⇒ need the whole collection".
 * `field` null means "need the whole row ⇒ all columns".
 */
function analyzeListPath(path) {
    const parts = pathParts(path);
    if (parts.length === 0) return { index: null, field: null };
    if (!/^\d+$/.test(parts[0])) return { index: null, field: null };
    const index = Number(parts[0]);
    if (parts.length === 1) return { index, field: null };
    return { index, field: parts[1] };
}

/** Build a Prisma `select` from referenced fields, or null to fetch all columns. */
function buildSelect(key, fields) {
    if (fields === null) return null;
    const valid = getModelColumns(key);
    if (!valid) return null;
    const validSet = new Set(valid);
    const select = { id: true };
    for (const field of fields) {
        // An unreferenced-yet-real or unknown field ⇒ fall back to all columns
        // so resolution stays correct (getValueByPath simply yields undefined).
        if (!validSet.has(field)) return null;
        select[field] = true;
    }
    return select;
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

    // List collections resolve to arrays. `key` is both the Prisma delegate and
    // the serializer key; `orderBy` matches the public site's ordering.
    const listModel = LIST_MODELS[lowerModel];
    if (listModel) {
        const value = await resolveList(listModel, path, cachedData, { rowLimit, useCache });
        return getValueByPath(value, path);
    }

    // Singleton documents are a single small row — cache the whole thing.
    const singleton = SINGLETON_MODELS[lowerModel];
    if (singleton) {
        if (cachedData[lowerModel] === undefined) {
            const cacheKey = `${lowerModel}:singleton`;
            let value = useCache ? cacheGet(cacheKey) : undefined;
            if (value === undefined) {
                try {
                    value = await singleton();
                } catch (err) {
                    console.error(`[CRON TEMPLATE ERROR] Failed to fetch model data for ${lowerModel}:`, err);
                    value = null;
                }
                if (useCache && value !== null) cacheSet(cacheKey, value);
            }
            cachedData[lowerModel] = value;
        }
        return getValueByPath(cachedData[lowerModel], path);
    }

    return `$${modelName}${path}`;
}

// Registry of array-valued collections: Prisma delegate / serializer key + the
// ordering the public site uses. Aliases (blog/blogs) share a `key` so they
// resolve to one cached fetch.
const LIST_MODELS = {
    blogs: { key: 'blog', orderBy: { createdAt: 'desc' } },
    blog: { key: 'blog', orderBy: { createdAt: 'desc' } },
    projects: { key: 'project', orderBy: { displayOrder: 'asc' } },
    project: { key: 'project', orderBy: { displayOrder: 'asc' } },
    gallery: { key: 'gallery', orderBy: { order: 'asc' } },
    socials: { key: 'social', orderBy: undefined },
    social: { key: 'social', orderBy: undefined },
    messages: { key: 'contactMessage', orderBy: { createdAt: 'desc' } },
    message: { key: 'contactMessage', orderBy: { createdAt: 'desc' } },
    deployments: { key: 'deployment', orderBy: { displayOrder: 'asc' } },
    deployment: { key: 'deployment', orderBy: { displayOrder: 'asc' } },
    crons: { key: 'cron', orderBy: undefined },
    cron: { key: 'cron', orderBy: undefined }
};

const SINGLETON_MODELS = {
    config: () => getSingleton(prisma, 'config'),
    about: () => getSingleton(prisma, 'about'),
    ads: () => getSingleton(prisma, 'ads'),
    theme: async () => toClient('theme', await prisma.theme.findFirst()),
    themes: async () => toClient('theme', await prisma.theme.findFirst())
};

/**
 * Fetch just enough of a list collection to satisfy `path`, upgrading an
 * already-cached fetch when a later placeholder in the same compile needs more
 * rows or more columns. State lives on `cachedData.__lists[key]` so aliases and
 * repeated fields within one template never re-query.
 */
async function resolveList(listModel, path, cachedData, { rowLimit, useCache }) {
    const { key, orderBy } = listModel;
    const lists = cachedData.__lists || (cachedData.__lists = {});
    const need = analyzeListPath(path);

    // Rows: bounded by the referenced index (whole collection ⇒ rowLimit).
    const neededTake = need.index === null ? rowLimit : Math.min(rowLimit, need.index + 1);
    // Columns: null (whole row) forces all columns; otherwise union the fields.
    const neededAllCols = need.field === null;

    const cached = lists[key];
    let take = neededTake;
    let fields; // Set<string> | null (null ⇒ all columns)
    if (cached) {
        take = Math.max(cached.take, neededTake);
        if (cached.fields === null || neededAllCols) {
            fields = null;
        } else {
            fields = new Set(cached.fields);
            fields.add(need.field);
        }
        const grew = take > cached.take
            || (cached.fields !== null && (neededAllCols || !cached.fields.has(need.field)));
        if (!grew) return cached.value;
    } else {
        fields = neededAllCols ? null : new Set([need.field]);
    }

    const select = buildSelect(key, fields);
    // If buildSelect fell back to all columns, remember that so we don't keep
    // re-trying a projection on later references.
    const effectiveFields = select === null ? null : fields;
    const value = await fetchList(key, { orderBy, take, select, useCache });

    lists[key] = { value, take, fields: effectiveFields };
    return value;
}

async function fetchList(key, { orderBy, take, select, useCache }) {
    const cacheKey = `${key}:${take}:${select === null ? '*' : Object.keys(select).sort().join(',')}`;
    let value = useCache ? cacheGet(cacheKey) : undefined;
    if (value !== undefined) return value;

    try {
        const args = { take };
        if (orderBy) args.orderBy = orderBy;
        if (select) args.select = select;
        value = toClientList(key, await prisma[key].findMany(args));
    } catch (err) {
        console.error(`[CRON TEMPLATE ERROR] Failed to fetch collection ${key}:`, err);
        value = [];
    }

    if (useCache) cacheSet(cacheKey, value);
    return value;
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
