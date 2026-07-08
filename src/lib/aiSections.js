/**
 * AI Hub section content — the relational, first-class data behind the four
 * curated /ai sections (skills, recommendations, credits, prompts).
 *
 * This module is the single source of truth for reading and mutating that
 * content. Both the public REST routes (/api/ai/*) and the MCP tools call these
 * functions, so validation, ordering, shaping, and cache invalidation live in
 * exactly one place.
 *
 * - CRUD helpers return client-shaped rows (`_id`, camelCase) via lib/serialize.
 * - Data shapers (`skillsData`, …) return the exact payloads the v2 renderers
 *   consume (`{ categories }`, `{ cards }`, `{ rows }`, `{ items }`), each item
 *   carrying its stable `id` (the renderers key off it).
 * - `hydrateAiSections` overlays those payloads onto the aiPage skeleton at read
 *   time, falling back to the skeleton's own `data` while a table is empty so
 *   nothing regresses before the one-time backfill runs.
 */
import { prisma } from '@/lib/prisma';
import { toClient, toClientList } from '@/lib/serialize';
import { getSession } from '@/lib/auth';
import { validateBearerBlogToken } from '@/lib/blogApiAuth';
import cache, { CACHE_KEYS } from '@/lib/cache';
import { DEFAULT_AI_PAGE } from '@/lib/aiPageDefaults';

// ───────────────────────────── validation ─────────────────────────────

/** Coerce/validate a string field. Throws on required-but-empty / over-length. */
export function str(value, field, { required = false, max = 20000 } = {}) {
    if (value === undefined || value === null) {
        if (required) throw new AiSectionError(`Missing required field: ${field}`);
        return undefined;
    }
    const s = String(value);
    if (required && !s.trim()) throw new AiSectionError(`Field "${field}" must not be empty.`);
    if (s.length > max) throw new AiSectionError(`Field "${field}" exceeds ${max} characters.`);
    return s;
}

/** Coerce/validate a bounded integer. */
export function int(value, field, { min = 0, max = 1_000_000, fallback } = {}) {
    if (value === undefined || value === null || value === '') return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) throw new AiSectionError(`Field "${field}" must be a number.`);
    return Math.max(min, Math.min(max, Math.round(n)));
}

/** Coerce a boolean-ish value. */
export function bool(value, fallback = undefined) {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return Boolean(value);
}

/** Validate a `string[]` (tags), bounding length + count. */
export function strArray(value, field, { max = 40 } = {}) {
    if (value === undefined || value === null) return undefined;
    if (!Array.isArray(value)) throw new AiSectionError(`Field "${field}" must be an array of strings.`);
    if (value.length > max) throw new AiSectionError(`Field "${field}" has too many items (max ${max}).`);
    return value.map((v) => String(v).slice(0, 120)).filter(Boolean);
}

/** A validation/not-found error carrying an HTTP status for the REST layer. */
export class AiSectionError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = 'AiSectionError';
        this.status = status;
    }
}

function notFound(what) {
    return new AiSectionError(`${what} not found.`, 404);
}

// ───────────────────────────── cache ─────────────────────────────

/** Invalidate the AI-page config + telemetry caches after any content write. */
export async function invalidateAiPage() {
    await cache.invalidateAsync(CACHE_KEYS.AI_PAGE);
    await cache.invalidateAsync(`${CACHE_KEYS.AI_PAGE}:stats`);
}

/** Next display order for a delegate (append to the end). */
async function nextOrder(delegate, where = {}) {
    const row = await delegate.findFirst({ where, orderBy: { displayOrder: 'desc' }, select: { displayOrder: true } });
    return Number.isFinite(row?.displayOrder) ? row.displayOrder + 1 : 0;
}

// ───────────────────────────── Skills ─────────────────────────────

/** All skill categories with their ordered skills, client-shaped. */
export async function listSkillCategories() {
    const cats = await prisma.aiSkillCategory.findMany({
        orderBy: { displayOrder: 'asc' },
        include: { skills: { orderBy: { displayOrder: 'asc' } } },
    });
    return cats.map((cat) => ({
        ...toClient('aiSkillCategory', cat),
        skills: toClientList('aiSkill', cat.skills),
    }));
}

/** Render-shape for the skills section: `{ categories:[{ id,label,accent,items }] }`. */
export async function skillsData() {
    const cats = await listSkillCategories();
    return {
        categories: cats.map((cat) => ({
            id: cat._id,
            label: cat.label,
            accent: cat.accent,
            items: (cat.skills || []).map((s) => ({
                id: s._id,
                name: s.name,
                description: s.description || '',
                ...(s.url ? { url: s.url } : {}),
            })),
        })),
    };
}

export async function createSkillCategory(input = {}) {
    const data = {
        label: str(input.label, 'label', { required: true, max: 120 }),
        accent: str(input.accent, 'accent', { max: 120 }) || 'var(--accent-cyan)',
        displayOrder: int(input.displayOrder, 'displayOrder', { fallback: undefined }),
    };
    if (data.displayOrder === undefined) data.displayOrder = await nextOrder(prisma.aiSkillCategory);
    const row = await prisma.aiSkillCategory.create({ data });
    await invalidateAiPage();
    return toClient('aiSkillCategory', row);
}

export async function updateSkillCategory(id, patch = {}) {
    await ensureExists(prisma.aiSkillCategory, id, 'Skill category');
    const data = {};
    if (patch.label !== undefined) data.label = str(patch.label, 'label', { required: true, max: 120 });
    if (patch.accent !== undefined) data.accent = str(patch.accent, 'accent', { max: 120 });
    if (patch.displayOrder !== undefined) data.displayOrder = int(patch.displayOrder, 'displayOrder', { fallback: 0 });
    if (Object.keys(data).length === 0) throw new AiSectionError('No updatable fields provided.');
    const row = await prisma.aiSkillCategory.update({ where: { id: String(id) }, data });
    await invalidateAiPage();
    return toClient('aiSkillCategory', row);
}

export async function deleteSkillCategory(id) {
    await ensureExists(prisma.aiSkillCategory, id, 'Skill category');
    await prisma.aiSkillCategory.delete({ where: { id: String(id) } }); // cascades skills
    await invalidateAiPage();
    return { deletedId: String(id) };
}

export async function createSkill(input = {}) {
    const categoryId = str(input.categoryId, 'categoryId', { required: true, max: 120 });
    await ensureExists(prisma.aiSkillCategory, categoryId, 'Skill category');
    const data = {
        categoryId,
        name: str(input.name, 'name', { required: true, max: 200 }),
        description: str(input.description, 'description', { max: 2000 }) || '',
        url: str(input.url, 'url', { max: 1000 }) || null,
        displayOrder: int(input.displayOrder, 'displayOrder', { fallback: undefined }),
    };
    if (data.displayOrder === undefined) data.displayOrder = await nextOrder(prisma.aiSkill, { categoryId });
    const row = await prisma.aiSkill.create({ data });
    await invalidateAiPage();
    return toClient('aiSkill', row);
}

export async function updateSkill(id, patch = {}) {
    await ensureExists(prisma.aiSkill, id, 'Skill');
    const data = {};
    if (patch.categoryId !== undefined) {
        const categoryId = str(patch.categoryId, 'categoryId', { required: true, max: 120 });
        await ensureExists(prisma.aiSkillCategory, categoryId, 'Skill category');
        data.categoryId = categoryId;
    }
    if (patch.name !== undefined) data.name = str(patch.name, 'name', { required: true, max: 200 });
    if (patch.description !== undefined) data.description = str(patch.description, 'description', { max: 2000 }) || '';
    if (patch.url !== undefined) data.url = str(patch.url, 'url', { max: 1000 }) || null;
    if (patch.displayOrder !== undefined) data.displayOrder = int(patch.displayOrder, 'displayOrder', { fallback: 0 });
    if (Object.keys(data).length === 0) throw new AiSectionError('No updatable fields provided.');
    const row = await prisma.aiSkill.update({ where: { id: String(id) }, data });
    await invalidateAiPage();
    return toClient('aiSkill', row);
}

export async function deleteSkill(id) {
    await ensureExists(prisma.aiSkill, id, 'Skill');
    await prisma.aiSkill.delete({ where: { id: String(id) } });
    await invalidateAiPage();
    return { deletedId: String(id) };
}

// ─────────────────────── Recommendations ───────────────────────

export async function listRecommendations() {
    const rows = await prisma.aiRecommendation.findMany({ orderBy: { displayOrder: 'asc' } });
    return toClientList('aiRecommendation', rows);
}

/** Render-shape: `{ cards:[{ id,name,url,rating,accent,blurb,tags }] }`. */
export async function recommendationsData() {
    const rows = await listRecommendations();
    return {
        cards: rows.map((r) => ({
            id: r._id,
            name: r.name,
            url: r.url || '',
            rating: r.rating,
            accent: r.accent,
            blurb: r.blurb || '',
            tags: Array.isArray(r.tags) ? r.tags : [],
        })),
    };
}

export async function createRecommendation(input = {}) {
    const data = {
        name: str(input.name, 'name', { required: true, max: 200 }),
        url: str(input.url, 'url', { max: 1000 }) || '',
        rating: int(input.rating, 'rating', { min: 0, max: 5, fallback: 5 }),
        accent: str(input.accent, 'accent', { max: 120 }) || 'var(--accent-cyan)',
        blurb: str(input.blurb, 'blurb', { max: 2000 }) || '',
        tags: strArray(input.tags, 'tags') || [],
        displayOrder: int(input.displayOrder, 'displayOrder', { fallback: undefined }),
    };
    if (data.displayOrder === undefined) data.displayOrder = await nextOrder(prisma.aiRecommendation);
    const row = await prisma.aiRecommendation.create({ data });
    await invalidateAiPage();
    return toClient('aiRecommendation', row);
}

export async function updateRecommendation(id, patch = {}) {
    await ensureExists(prisma.aiRecommendation, id, 'Recommendation');
    const data = {};
    if (patch.name !== undefined) data.name = str(patch.name, 'name', { required: true, max: 200 });
    if (patch.url !== undefined) data.url = str(patch.url, 'url', { max: 1000 }) || '';
    if (patch.rating !== undefined) data.rating = int(patch.rating, 'rating', { min: 0, max: 5, fallback: 5 });
    if (patch.accent !== undefined) data.accent = str(patch.accent, 'accent', { max: 120 });
    if (patch.blurb !== undefined) data.blurb = str(patch.blurb, 'blurb', { max: 2000 }) || '';
    if (patch.tags !== undefined) data.tags = strArray(patch.tags, 'tags') || [];
    if (patch.displayOrder !== undefined) data.displayOrder = int(patch.displayOrder, 'displayOrder', { fallback: 0 });
    if (Object.keys(data).length === 0) throw new AiSectionError('No updatable fields provided.');
    const row = await prisma.aiRecommendation.update({ where: { id: String(id) }, data });
    await invalidateAiPage();
    return toClient('aiRecommendation', row);
}

export async function deleteRecommendation(id) {
    await ensureExists(prisma.aiRecommendation, id, 'Recommendation');
    await prisma.aiRecommendation.delete({ where: { id: String(id) } });
    await invalidateAiPage();
    return { deletedId: String(id) };
}

// ───────────────────────────── Credits ─────────────────────────────

export async function listCredits() {
    const rows = await prisma.aiCredit.findMany({ orderBy: { displayOrder: 'asc' } });
    return toClientList('aiCredit', rows);
}

/** Render-shape: `{ rows:[{ id,name,offer,url,noCard,freeApi,note }] }`. */
export async function creditsData() {
    const rows = await listCredits();
    return {
        rows: rows.map((r) => ({
            id: r._id,
            name: r.name,
            offer: r.offer || '',
            url: r.url || '',
            noCard: r.noCard !== false,
            freeApi: r.freeApi !== false,
            note: r.note || '',
        })),
    };
}

export async function createCredit(input = {}) {
    const data = {
        name: str(input.name, 'name', { required: true, max: 200 }),
        offer: str(input.offer, 'offer', { max: 2000 }) || '',
        url: str(input.url, 'url', { max: 1000 }) || '',
        noCard: bool(input.noCard, true),
        freeApi: bool(input.freeApi, true),
        note: str(input.note, 'note', { max: 500 }) || '',
        displayOrder: int(input.displayOrder, 'displayOrder', { fallback: undefined }),
    };
    if (data.displayOrder === undefined) data.displayOrder = await nextOrder(prisma.aiCredit);
    const row = await prisma.aiCredit.create({ data });
    await invalidateAiPage();
    return toClient('aiCredit', row);
}

export async function updateCredit(id, patch = {}) {
    await ensureExists(prisma.aiCredit, id, 'Credit');
    const data = {};
    if (patch.name !== undefined) data.name = str(patch.name, 'name', { required: true, max: 200 });
    if (patch.offer !== undefined) data.offer = str(patch.offer, 'offer', { max: 2000 }) || '';
    if (patch.url !== undefined) data.url = str(patch.url, 'url', { max: 1000 }) || '';
    if (patch.noCard !== undefined) data.noCard = bool(patch.noCard, true);
    if (patch.freeApi !== undefined) data.freeApi = bool(patch.freeApi, true);
    if (patch.note !== undefined) data.note = str(patch.note, 'note', { max: 500 }) || '';
    if (patch.displayOrder !== undefined) data.displayOrder = int(patch.displayOrder, 'displayOrder', { fallback: 0 });
    if (Object.keys(data).length === 0) throw new AiSectionError('No updatable fields provided.');
    const row = await prisma.aiCredit.update({ where: { id: String(id) }, data });
    await invalidateAiPage();
    return toClient('aiCredit', row);
}

export async function deleteCredit(id) {
    await ensureExists(prisma.aiCredit, id, 'Credit');
    await prisma.aiCredit.delete({ where: { id: String(id) } });
    await invalidateAiPage();
    return { deletedId: String(id) };
}

// ───────────────────────────── Prompts ─────────────────────────────

export async function listPrompts() {
    const rows = await prisma.aiPrompt.findMany({ orderBy: { displayOrder: 'asc' } });
    return toClientList('aiPrompt', rows);
}

/** Render-shape: `{ items:[{ id,title,role,prompt }] }`. */
export async function promptsData() {
    const rows = await listPrompts();
    return {
        items: rows.map((p) => ({
            id: p._id,
            title: p.title,
            role: p.role || '',
            prompt: p.prompt || '',
        })),
    };
}

export async function createPrompt(input = {}) {
    const data = {
        title: str(input.title, 'title', { required: true, max: 200 }),
        role: str(input.role, 'role', { max: 80 }) || '',
        prompt: str(input.prompt, 'prompt', { required: true, max: 20000 }),
        displayOrder: int(input.displayOrder, 'displayOrder', { fallback: undefined }),
    };
    if (data.displayOrder === undefined) data.displayOrder = await nextOrder(prisma.aiPrompt);
    const row = await prisma.aiPrompt.create({ data });
    await invalidateAiPage();
    return toClient('aiPrompt', row);
}

export async function updatePrompt(id, patch = {}) {
    await ensureExists(prisma.aiPrompt, id, 'Prompt');
    const data = {};
    if (patch.title !== undefined) data.title = str(patch.title, 'title', { required: true, max: 200 });
    if (patch.role !== undefined) data.role = str(patch.role, 'role', { max: 80 }) || '';
    if (patch.prompt !== undefined) data.prompt = str(patch.prompt, 'prompt', { required: true, max: 20000 });
    if (patch.displayOrder !== undefined) data.displayOrder = int(patch.displayOrder, 'displayOrder', { fallback: 0 });
    if (Object.keys(data).length === 0) throw new AiSectionError('No updatable fields provided.');
    const row = await prisma.aiPrompt.update({ where: { id: String(id) }, data });
    await invalidateAiPage();
    return toClient('aiPrompt', row);
}

export async function deletePrompt(id) {
    await ensureExists(prisma.aiPrompt, id, 'Prompt');
    await prisma.aiPrompt.delete({ where: { id: String(id) } });
    await invalidateAiPage();
    return { deletedId: String(id) };
}

// ───────────────────────────── shared ─────────────────────────────

async function ensureExists(delegate, id, what) {
    const row = await delegate.findUnique({ where: { id: String(id || '') }, select: { id: true } });
    if (!row) throw notFound(what);
    return row;
}

/** Section types whose `data` is sourced from relational tables. */
export const DB_BACKED_SECTION_TYPES = ['skills', 'recommendations', 'credits', 'prompts'];

/**
 * Overlay DB-sourced content onto the aiPage skeleton. For each content
 * section, replace `data` with the table's shaped payload; if the table is
 * still empty, keep the skeleton's own `data` so the page never renders blank
 * before the one-time backfill.
 */
export async function hydrateAiSections(config) {
    if (!config || !Array.isArray(config.sections)) return config;

    const [skills, recommendations, credits, prompts] = await Promise.all([
        skillsData(),
        recommendationsData(),
        creditsData(),
        promptsData(),
    ]);
    const shaped = {
        skills: { data: skills, nonEmpty: skills.categories.length > 0 },
        recommendations: { data: recommendations, nonEmpty: recommendations.cards.length > 0 },
        credits: { data: credits, nonEmpty: credits.rows.length > 0 },
        prompts: { data: prompts, nonEmpty: prompts.items.length > 0 },
    };

    const sections = config.sections.map((section) => {
        const entry = section && shaped[section.type];
        if (!entry) return section;
        // Empty table → keep skeleton default so nothing regresses pre-backfill.
        return entry.nonEmpty ? { ...section, data: entry.data } : section;
    });

    return { ...config, sections };
}

/** True if none of the four content tables hold any rows yet. */
export async function aiSectionsAreEmpty() {
    const [c, r, cr, p] = await Promise.all([
        prisma.aiSkillCategory.count(),
        prisma.aiRecommendation.count(),
        prisma.aiCredit.count(),
        prisma.aiPrompt.count(),
    ]);
    return c === 0 && r === 0 && cr === 0 && p === 0;
}

/**
 * One-time idempotent backfill: seed the four tables from a source config
 * (the stored aiPage singleton if it carries content, else the bundled
 * defaults). No-ops per table that already has rows, so it is safe to re-run.
 */
export async function seedDefaultsIfEmpty(sourceConfig) {
    const source = sourceConfig && Array.isArray(sourceConfig.sections) ? sourceConfig : DEFAULT_AI_PAGE;
    const byType = {};
    for (const s of source.sections || []) if (s?.type) byType[s.type] = s;

    let seeded = { skills: 0, recommendations: 0, credits: 0, prompts: 0 };

    // Skills (categories + nested items).
    if ((await prisma.aiSkillCategory.count()) === 0) {
        const cats = byType.skills?.data?.categories || DEFAULT_AI_PAGE.sections.find((s) => s.type === 'skills').data.categories;
        for (let ci = 0; ci < cats.length; ci++) {
            const cat = cats[ci];
            const created = await prisma.aiSkillCategory.create({
                data: { label: cat.label, accent: cat.accent || 'var(--accent-cyan)', displayOrder: ci },
            });
            const items = Array.isArray(cat.items) ? cat.items : [];
            for (let i = 0; i < items.length; i++) {
                await prisma.aiSkill.create({
                    data: {
                        categoryId: created.id,
                        name: items[i].name,
                        description: items[i].description || '',
                        url: items[i].url || null,
                        displayOrder: i,
                    },
                });
            }
            seeded.skills += items.length;
        }
    }

    // Recommendations.
    if ((await prisma.aiRecommendation.count()) === 0) {
        const cards = byType.recommendations?.data?.cards || DEFAULT_AI_PAGE.sections.find((s) => s.type === 'recommendations').data.cards;
        for (let i = 0; i < cards.length; i++) {
            const c = cards[i];
            await prisma.aiRecommendation.create({
                data: {
                    name: c.name,
                    url: c.url || '',
                    rating: Number.isFinite(c.rating) ? c.rating : 5,
                    accent: c.accent || 'var(--accent-cyan)',
                    blurb: c.blurb || '',
                    tags: Array.isArray(c.tags) ? c.tags : [],
                    displayOrder: i,
                },
            });
            seeded.recommendations++;
        }
    }

    // Credits.
    if ((await prisma.aiCredit.count()) === 0) {
        const rows = byType.credits?.data?.rows || DEFAULT_AI_PAGE.sections.find((s) => s.type === 'credits').data.rows;
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            await prisma.aiCredit.create({
                data: {
                    name: r.name,
                    offer: r.offer || '',
                    url: r.url || '',
                    noCard: r.noCard !== false,
                    freeApi: r.freeApi !== false,
                    note: r.note || '',
                    displayOrder: i,
                },
            });
            seeded.credits++;
        }
    }

    // Prompts.
    if ((await prisma.aiPrompt.count()) === 0) {
        const items = byType.prompts?.data?.items || DEFAULT_AI_PAGE.sections.find((s) => s.type === 'prompts').data.items;
        for (let i = 0; i < items.length; i++) {
            const p = items[i];
            await prisma.aiPrompt.create({
                data: { title: p.title, role: p.role || '', prompt: p.prompt || '', displayOrder: i },
            });
            seeded.prompts++;
        }
    }

    await invalidateAiPage();
    return seeded;
}

// ───────────────────────────── write auth ─────────────────────────────

/**
 * Authorize a write to the AI-section REST endpoints. Accepts EITHER an admin
 * session cookie OR a bearer token (blog API token / MCP write token) — the
 * same dual-auth the blog/content APIs use. Returns true when authorized.
 */
export async function requireAiWrite(request) {
    const session = await getSession();
    if (session) return true;
    return validateBearerBlogToken(request);
}
