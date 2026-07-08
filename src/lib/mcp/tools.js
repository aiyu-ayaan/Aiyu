/**
 * Server-side MCP tool / resource / prompt definitions for the StreamableHTTP
 * endpoint at /api/mcp.
 *
 * These are the *executable* half of the MCP server: unlike the browser WebMCP
 * tools (which run in the visitor's browser via navigator.modelContext) and the
 * declarative tool list edited in /admin/mcp (which drives the discovery server
 * card), the handlers here run on the server and read the portfolio's public
 * data directly through the shared data fetchers — so an agent like Claude or
 * Hermes that connects over HTTP gets real, executable capabilities.
 *
 * Everything is read-only and exposes only already-public data (the same data
 * behind /api/projects, /api/blogs, etc.). No admin/secret data is reachable.
 */
import {
    getAboutData,
    getProjectsData,
    getPublishedBlogs,
    getDeploymentsData,
    getBlogById,
} from '@/lib/dataFetchers';
import { getApiCatalog } from '@/lib/agentDiscovery';
import { prisma } from '@/lib/prisma';
import { toClient, fromClient, getSingleton } from '@/lib/serialize';
import cache, { CACHE_KEYS } from '@/lib/cache';
import { logAudit, AUDIT_CATEGORY } from '@/lib/audit';
import { assertMcpWrite, getMcpAuth } from '@/lib/mcp/auth';
import { DEFAULT_AI_PAGE, AI_SECTION_TYPES } from '@/lib/aiPageDefaults';
import {
    hydrateAiSections,
    skillsData, recommendationsData, creditsData, promptsData,
    listSkillCategories,
    createSkillCategory, updateSkillCategory, deleteSkillCategory,
    createSkill, updateSkill, deleteSkill,
    createRecommendation, updateRecommendation, deleteRecommendation,
    createCredit, updateCredit, deleteCredit,
    createPrompt, updatePrompt, deletePrompt,
} from '@/lib/aiSections';

const NO_ARGS = { type: 'object', properties: {}, additionalProperties: false };

function blogSummary(b) {
    return {
        id: b?._id || b?.id,
        title: b?.title,
        slug: b?.slug,
        excerpt: b?.excerpt,
        date: b?.date,
        tags: b?.tags || [],
    };
}

async function searchPortfolio({ query } = {}) {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return { query: '', count: 0, results: [] };

    const [projects, blogs, deployments] = await Promise.all([
        getProjectsData(),
        getPublishedBlogs(),
        getDeploymentsData(),
    ]);
    const has = (text) => String(text || '').toLowerCase().includes(q);
    const anyHas = (arr) => Array.isArray(arr) && arr.some(has);
    const results = [];

    for (const p of projects || []) {
        if (has(p.name) || has(p.description) || anyHas(p.techStack)) {
            results.push({ type: 'project', title: p.name, slug: p.slug, description: p.description, codeLink: p.codeLink });
        }
    }
    for (const b of blogs || []) {
        if (has(b.title) || has(b.excerpt) || anyHas(b.tags)) {
            results.push({ type: 'blog', title: b.title, slug: b.slug, excerpt: b.excerpt });
        }
    }
    for (const d of deployments || []) {
        if (has(d.name) || has(d.description)) {
            results.push({ type: 'deployment', title: d.name, url: d.hostedUrl, description: d.description });
        }
    }
    return { query, count: results.length, results };
}

// ─────────────────────────── AI Hub page ───────────────────────────
// The /ai page is schema-driven: its config is an ordered array of section
// objects stored in the `aiPage` singleton. Each section has the shape:
//   { id, type, enabled, eyebrow, title, subtitle, accent, data }
// where `type` is one of AI_SECTION_TYPES and `data` is the type-specific
// payload (e.g. skills → { categories:[{ id,label,accent,items:[{name,description,url?}] }] }).

/**
 * Load the stored AI-page config (skeleton), falling back to the bundled
 * defaults, then hydrate the four content sections from their relational
 * tables so reads return real, editable content.
 */
async function loadAiPageConfig() {
    const stored = await getSingleton(prisma, 'aiPage');
    const skeleton = !stored || !Array.isArray(stored.sections) || stored.sections.length === 0
        ? JSON.parse(JSON.stringify(DEFAULT_AI_PAGE))
        : stored;
    return hydrateAiSections(skeleton);
}

/** Compact view of a section for listings. */
function aiSectionSummary(section, index) {
    return {
        id: section?.id,
        type: section?.type,
        title: section?.title,
        enabled: section?.enabled !== false,
        order: index,
    };
}

/** @typedef {{ name:string, title:string, description:string, inputSchema:object, annotations?:object, handler:(args:object)=>Promise<any> }} McpTool */

/** @type {McpTool[]} */
export const TOOLS = [
    {
        name: 'search_portfolio',
        title: 'Search Portfolio',
        description: 'Search across projects, blog posts, and live deployments by keyword.',
        inputSchema: {
            type: 'object',
            properties: { query: { type: 'string', description: 'Keyword(s) to search for.' } },
            required: ['query'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: true, openWorldHint: false },
        handler: searchPortfolio,
    },
    {
        name: 'list_projects',
        title: 'List Projects',
        description: 'List all portfolio projects with tech stack, type, and links.',
        inputSchema: NO_ARGS,
        annotations: { readOnlyHint: true },
        handler: async () => (await getProjectsData()) || [],
    },
    {
        name: 'list_blogs',
        title: 'List Blog Posts',
        description: 'List published blog posts as summaries (title, slug, excerpt, date, tags).',
        inputSchema: NO_ARGS,
        annotations: { readOnlyHint: true },
        handler: async () => ((await getPublishedBlogs()) || []).map(blogSummary),
    },
    {
        name: 'get_blog',
        title: 'Get Blog Post',
        description: 'Fetch the full content of a single published blog post by id or slug.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string', description: 'Blog post id or slug.' } },
            required: ['id'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        handler: async ({ id } = {}) => {
            const blog = await getBlogById(String(id || ''));
            if (!blog) throw new Error('Blog post not found.');
            return blog;
        },
    },
    {
        name: 'list_deployments',
        title: 'List Deployments',
        description: 'List live deployments / hosted apps with status and URLs.',
        inputSchema: NO_ARGS,
        annotations: { readOnlyHint: true },
        handler: async () => (await getDeploymentsData()) || [],
    },
    {
        name: 'get_profile',
        title: 'Get Profile',
        description: "Get the developer's about / resume profile (bio, skills, experience).",
        inputSchema: NO_ARGS,
        annotations: { readOnlyHint: true },
        handler: async () => (await getAboutData()) || {},
    },
    {
        name: 'get_api_catalog',
        title: 'Get API Catalog',
        description: 'Get the machine-readable catalog of the public REST API.',
        inputSchema: NO_ARGS,
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async () => getApiCatalog(),
    },
    {
        name: 'get_ai_page',
        title: 'Get AI Hub Page',
        description:
            'Get the full AI Hub (/ai) configuration: the ordered array of section objects that drive the page. Falls back to bundled defaults if nothing is stored yet.',
        inputSchema: NO_ARGS,
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async () => {
            const config = await loadAiPageConfig();
            return { sectionTypes: AI_SECTION_TYPES, sections: config.sections || [] };
        },
    },
    {
        name: 'list_ai_sections',
        title: 'List AI Hub Sections',
        description:
            'List the AI Hub (/ai) sections as compact summaries (id, type, title, enabled, order). Use get_ai_section for a full section.',
        inputSchema: NO_ARGS,
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async () => {
            const config = await loadAiPageConfig();
            return (config.sections || []).map(aiSectionSummary);
        },
    },
    {
        name: 'get_ai_section',
        title: 'Get AI Hub Section',
        description:
            'Get one AI Hub (/ai) section by id, including its full type-specific `data` payload. Section shape: { id, type, enabled, eyebrow, title, subtitle, accent, data }.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string', description: 'The section id (see list_ai_sections).' } },
            required: ['id'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async ({ id } = {}) => {
            const wanted = String(id || '');
            const config = await loadAiPageConfig();
            const section = (config.sections || []).find((s) => s?.id === wanted);
            if (!section) throw new Error(`AI Hub section not found: "${wanted}".`);
            return section;
        },
    },
    {
        name: 'list_ai_skills',
        title: 'List AI Skills',
        description:
            'List the AI Hub skills grouped by category: { categories: [{ id, label, accent, items: [{ id, name, description, url? }] }] }.',
        inputSchema: NO_ARGS,
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async () => skillsData(),
    },
    {
        name: 'list_ai_recommendations',
        title: 'List AI Recommendations',
        description:
            'List the recommended-stack cards: { cards: [{ id, name, url, rating, accent, blurb, tags }] }.',
        inputSchema: NO_ARGS,
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async () => recommendationsData(),
    },
    {
        name: 'list_ai_credits',
        title: 'List AI Free Credits',
        description:
            'List the free-credits / free-tier rows: { rows: [{ id, name, offer, url, noCard, freeApi, note }] }.',
        inputSchema: NO_ARGS,
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async () => creditsData(),
    },
    {
        name: 'list_ai_prompts',
        title: 'List AI Prompts',
        description:
            'List the prompt-library entries: { items: [{ id, title, role, prompt }] }.',
        inputSchema: NO_ARGS,
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async () => promptsData(),
    },
];

/** @typedef {{ uri:string, name:string, title:string, description:string, mimeType:string, read:()=>Promise<any> }} McpResource */

/** @type {McpResource[]} */
export const RESOURCES = [
    { uri: 'aiyu://profile', name: 'profile', title: 'Developer Profile', description: 'About / resume profile data.', mimeType: 'application/json', read: async () => (await getAboutData()) || {} },
    { uri: 'aiyu://projects', name: 'projects', title: 'Projects', description: 'All portfolio projects.', mimeType: 'application/json', read: async () => (await getProjectsData()) || [] },
    { uri: 'aiyu://blogs', name: 'blogs', title: 'Blog Posts', description: 'Published blog post summaries.', mimeType: 'application/json', read: async () => ((await getPublishedBlogs()) || []).map(blogSummary) },
    { uri: 'aiyu://deployments', name: 'deployments', title: 'Deployments', description: 'Live deployments / hosted apps.', mimeType: 'application/json', read: async () => (await getDeploymentsData()) || [] },
    { uri: 'aiyu://api-catalog', name: 'api-catalog', title: 'API Catalog', description: 'Public REST API catalog.', mimeType: 'application/json', read: async () => getApiCatalog() },
    { uri: 'aiyu://ai-page', name: 'ai-page', title: 'AI Hub Page Config', description: 'Schema-driven section config for the /ai page.', mimeType: 'application/json', read: async () => await loadAiPageConfig() },
    { uri: 'aiyu://ai-skills', name: 'ai-skills', title: 'AI Skills', description: 'AI skills grouped by category.', mimeType: 'application/json', read: async () => skillsData() },
    { uri: 'aiyu://ai-recommendations', name: 'ai-recommendations', title: 'AI Recommendations', description: 'Recommended AI stack cards.', mimeType: 'application/json', read: async () => recommendationsData() },
    { uri: 'aiyu://ai-credits', name: 'ai-credits', title: 'AI Free Credits', description: 'Free credits & free-tier providers.', mimeType: 'application/json', read: async () => creditsData() },
    { uri: 'aiyu://ai-prompts', name: 'ai-prompts', title: 'AI Prompt Library', description: 'Reusable system prompts.', mimeType: 'application/json', read: async () => promptsData() },
];

// ─────────────────────────── Write tools ───────────────────────────
// Guarded mutations. Every handler re-asserts auth via assertMcpWrite() (bearer
// token + admin write switch), validates + bounds its inputs, invalidates the
// affected caches, and records an audit-log entry. They are only registered and
// advertised when write access is enabled AND the request is authenticated
// (see lib/mcp/server.js).

function str(value, field, { required = false, max = 20000 } = {}) {
    if (value === undefined || value === null) {
        if (required) throw new Error(`Missing required field: ${field}`);
        return undefined;
    }
    const s = String(value);
    if (required && !s.trim()) throw new Error(`Field "${field}" must not be empty.`);
    if (s.length > max) throw new Error(`Field "${field}" exceeds ${max} characters.`);
    return s;
}

function strArray(value, field, { max = 60 } = {}) {
    if (value === undefined || value === null) return undefined;
    if (!Array.isArray(value)) throw new Error(`Field "${field}" must be an array of strings.`);
    if (value.length > max) throw new Error(`Field "${field}" has too many items (max ${max}).`);
    return value.map((v) => String(v).slice(0, 200));
}

function slugify(value) {
    return String(value || '')
        .toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 120);
}

async function auditWrite(action, details) {
    const { ip, userAgent } = getMcpAuth();
    await logAudit({ action, category: AUDIT_CATEGORY.CONTENT, details, ipAddress: ip, userAgent });
}

async function nextDisplayOrder(delegate) {
    const row = await delegate.findFirst({ orderBy: { displayOrder: 'desc' }, select: { displayOrder: true } });
    return Number.isFinite(row?.displayOrder) ? row.displayOrder + 1 : 0;
}

/** @type {McpTool[]} */
export const WRITE_TOOLS = [
    {
        name: 'create_project',
        title: 'Create Project',
        description: 'Create a new portfolio project. Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                year: { type: 'string', description: 'e.g. "2025".' },
                status: { type: 'string', description: 'e.g. "Completed", "In Progress".' },
                projectType: { type: 'string' },
                description: { type: 'string' },
                techStack: { type: 'array', items: { type: 'string' } },
                codeLink: { type: 'string' },
                blogLink: { type: 'string' },
                image: { type: 'string' },
            },
            required: ['name', 'year', 'status', 'projectType', 'description'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const payload = {
                name: str(args.name, 'name', { required: true, max: 200 }),
                year: str(args.year, 'year', { required: true, max: 40 }),
                status: str(args.status, 'status', { required: true, max: 60 }),
                projectType: str(args.projectType, 'projectType', { required: true, max: 60 }),
                description: str(args.description, 'description', { required: true, max: 5000 }),
            };
            const techStack = strArray(args.techStack, 'techStack');
            if (techStack) payload.techStack = techStack;
            for (const k of ['codeLink', 'blogLink', 'image']) {
                const v = str(args[k], k, { max: 1000 });
                if (v) payload[k] = v;
            }
            payload.displayOrder = await nextDisplayOrder(prisma.project);
            const created = await prisma.project.create({ data: fromClient('project', payload, { keepId: false }) });
            await cache.invalidatePrefixAsync('db:projects');
            const client = toClient('project', created);
            await auditWrite('MCP_CREATE_PROJECT', `Created project "${payload.name}" (${client._id})`);
            return { ok: true, project: client };
        },
    },
    {
        name: 'update_project',
        title: 'Update Project',
        description: 'Update fields of an existing project by id. Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                year: { type: 'string' },
                status: { type: 'string' },
                projectType: { type: 'string' },
                description: { type: 'string' },
                techStack: { type: 'array', items: { type: 'string' } },
                codeLink: { type: 'string' },
                blogLink: { type: 'string' },
                image: { type: 'string' },
                displayOrder: { type: 'number' },
            },
            required: ['id'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const id = str(args.id, 'id', { required: true, max: 120 });
            const existing = await prisma.project.findUnique({ where: { id } });
            if (!existing) throw new Error('Project not found.');
            const patch = {};
            for (const k of ['name', 'year', 'status', 'projectType', 'description', 'codeLink', 'blogLink', 'image']) {
                const v = str(args[k], k, { max: 5000 });
                if (v !== undefined) patch[k] = v;
            }
            if (args.techStack !== undefined) patch.techStack = strArray(args.techStack, 'techStack') || [];
            if (args.displayOrder !== undefined) {
                const n = Number(args.displayOrder);
                if (!Number.isFinite(n)) throw new Error('Field "displayOrder" must be a number.');
                patch.displayOrder = n;
            }
            if (Object.keys(patch).length === 0) throw new Error('No updatable fields provided.');
            const updated = await prisma.project.update({ where: { id }, data: fromClient('project', patch, { keepId: false }) });
            await cache.invalidatePrefixAsync('db:projects');
            await auditWrite('MCP_UPDATE_PROJECT', `Updated project ${id} [${Object.keys(patch).join(', ')}]`);
            return { ok: true, project: toClient('project', updated) };
        },
    },
    {
        name: 'delete_project',
        title: 'Delete Project',
        description: 'Permanently delete a project by id. Destructive. Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string' } },
            required: ['id'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const id = str(args.id, 'id', { required: true, max: 120 });
            const existing = await prisma.project.findUnique({ where: { id }, select: { id: true, name: true } });
            if (!existing) throw new Error('Project not found.');
            await prisma.project.delete({ where: { id } });
            await cache.invalidatePrefixAsync('db:projects');
            await auditWrite('MCP_DELETE_PROJECT', `Deleted project "${existing.name}" (${id})`);
            return { ok: true, deletedId: id };
        },
    },
    {
        name: 'create_blog_post',
        title: 'Create Blog Post',
        description: 'Create a new blog post (defaults to an unpublished draft). Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                content: { type: 'string', description: 'Markdown body.' },
                excerpt: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                published: { type: 'boolean', description: 'Defaults to false (draft).' },
                image: { type: 'string' },
                imageAlt: { type: 'string' },
            },
            required: ['title', 'content'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const title = str(args.title, 'title', { required: true, max: 300 });
            const payload = {
                title,
                content: str(args.content, 'content', { required: true, max: 100000 }),
                excerpt: str(args.excerpt, 'excerpt', { max: 1000 }) || '',
                date: new Date().toISOString().slice(0, 10),
                published: args.published === true,
                slug: slugify(title),
            };
            const tags = strArray(args.tags, 'tags');
            if (tags) payload.tags = tags;
            const image = str(args.image, 'image', { max: 1000 });
            if (image) payload.image = image;
            const imageAlt = str(args.imageAlt, 'imageAlt', { max: 300 });
            if (imageAlt) payload.imageAlt = imageAlt;
            const created = await prisma.blog.create({ data: fromClient('blog', payload, { keepId: false }) });
            await cache.invalidatePrefixAsync('db:blogs');
            const client = toClient('blog', created);
            await auditWrite('MCP_CREATE_BLOG', `Created blog "${title}" (${client._id}) published=${payload.published}`);
            return { ok: true, blog: { id: client._id, title: client.title, slug: client.slug, published: client.published } };
        },
    },
    {
        name: 'create_deployment',
        title: 'Create Deployment',
        description: 'Create a new live deployment / hosted app entry. Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                appType: { type: 'string' },
                hostingProvider: { type: 'string' },
                description: { type: 'string' },
                status: { type: 'string', description: 'Defaults to "Live".' },
                environment: { type: 'string', description: 'Defaults to "Production".' },
                hostedUrl: { type: 'string' },
                techStack: { type: 'array', items: { type: 'string' } },
                image: { type: 'string' },
            },
            required: ['name', 'appType', 'hostingProvider', 'description'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const payload = {
                name: str(args.name, 'name', { required: true, max: 200 }),
                appType: str(args.appType, 'appType', { required: true, max: 80 }),
                hostingProvider: str(args.hostingProvider, 'hostingProvider', { required: true, max: 120 }),
                description: str(args.description, 'description', { required: true, max: 5000 }),
                status: str(args.status, 'status', { max: 40 }) || 'Live',
                environment: str(args.environment, 'environment', { max: 60 }) || 'Production',
            };
            const hostedUrl = str(args.hostedUrl, 'hostedUrl', { max: 500 });
            if (hostedUrl) payload.hostedUrl = hostedUrl;
            const techStack = strArray(args.techStack, 'techStack');
            if (techStack) payload.techStack = techStack;
            const image = str(args.image, 'image', { max: 1000 });
            if (image) payload.image = image;
            payload.displayOrder = await nextDisplayOrder(prisma.deployment);
            const created = await prisma.deployment.create({ data: fromClient('deployment', payload, { keepId: false }) });
            await cache.invalidatePrefixAsync('db:deployments');
            const client = toClient('deployment', created);
            await auditWrite('MCP_CREATE_DEPLOYMENT', `Created deployment "${payload.name}" (${client._id})`);
            return { ok: true, deployment: client };
        },
    },
    // ─────────────────── AI Hub content (per-section) ───────────────────
    // Guarded CRUD over the four /ai content sections. Validation, ordering,
    // and cache invalidation live in lib/aiSections; each tool just asserts
    // write auth, delegates, and records an audit entry. Mirrors the public
    // REST surface under /api/ai/*.
    {
        name: 'create_ai_skill_category',
        title: 'Create AI Skill Category',
        description: 'Add a skill filter category (e.g. "Motion & Animation"). Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                label: { type: 'string' },
                accent: { type: 'string', description: 'CSS color, e.g. "var(--accent-cyan)".' },
                displayOrder: { type: 'number' },
            },
            required: ['label'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const category = await createSkillCategory(args);
            await auditWrite('MCP_CREATE_AI_SKILL_CATEGORY', `Created AI skill category "${category.label}" (${category._id})`);
            return { ok: true, category };
        },
    },
    {
        name: 'update_ai_skill_category',
        title: 'Update AI Skill Category',
        description: 'Update a skill category by id. Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                accent: { type: 'string' },
                displayOrder: { type: 'number' },
            },
            required: ['id'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const { id, ...patch } = args;
            const category = await updateSkillCategory(id, patch);
            await auditWrite('MCP_UPDATE_AI_SKILL_CATEGORY', `Updated AI skill category ${id}`);
            return { ok: true, category };
        },
    },
    {
        name: 'delete_ai_skill_category',
        title: 'Delete AI Skill Category',
        description: 'Delete a skill category and all its skills by id. Destructive. Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string' } },
            required: ['id'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const result = await deleteSkillCategory(args.id);
            await auditWrite('MCP_DELETE_AI_SKILL_CATEGORY', `Deleted AI skill category ${args.id}`);
            return { ok: true, ...result };
        },
    },
    {
        name: 'create_ai_skill',
        title: 'Create AI Skill',
        description: 'Add a skill to a category ({ categoryId, name, description?, url? }). Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                categoryId: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                url: { type: 'string' },
                displayOrder: { type: 'number' },
            },
            required: ['categoryId', 'name'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const skill = await createSkill(args);
            await auditWrite('MCP_CREATE_AI_SKILL', `Created AI skill "${skill.name}" (${skill._id})`);
            return { ok: true, skill };
        },
    },
    {
        name: 'update_ai_skill',
        title: 'Update AI Skill',
        description: 'Update a skill by id (fields: categoryId, name, description, url, displayOrder). Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                categoryId: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                url: { type: 'string' },
                displayOrder: { type: 'number' },
            },
            required: ['id'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const { id, ...patch } = args;
            const skill = await updateSkill(id, patch);
            await auditWrite('MCP_UPDATE_AI_SKILL', `Updated AI skill ${id}`);
            return { ok: true, skill };
        },
    },
    {
        name: 'delete_ai_skill',
        title: 'Delete AI Skill',
        description: 'Delete a skill by id. Destructive. Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string' } },
            required: ['id'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const result = await deleteSkill(args.id);
            await auditWrite('MCP_DELETE_AI_SKILL', `Deleted AI skill ${args.id}`);
            return { ok: true, ...result };
        },
    },
    {
        name: 'create_ai_recommendation',
        title: 'Create AI Recommendation',
        description: 'Add a recommended-stack card ({ name, url?, rating?, accent?, blurb?, tags? }). Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                url: { type: 'string' },
                rating: { type: 'number', description: '0–5.' },
                accent: { type: 'string' },
                blurb: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                displayOrder: { type: 'number' },
            },
            required: ['name'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const recommendation = await createRecommendation(args);
            await auditWrite('MCP_CREATE_AI_RECOMMENDATION', `Created AI recommendation "${recommendation.name}" (${recommendation._id})`);
            return { ok: true, recommendation };
        },
    },
    {
        name: 'update_ai_recommendation',
        title: 'Update AI Recommendation',
        description: 'Update a recommendation card by id. Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                url: { type: 'string' },
                rating: { type: 'number' },
                accent: { type: 'string' },
                blurb: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                displayOrder: { type: 'number' },
            },
            required: ['id'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const { id, ...patch } = args;
            const recommendation = await updateRecommendation(id, patch);
            await auditWrite('MCP_UPDATE_AI_RECOMMENDATION', `Updated AI recommendation ${id}`);
            return { ok: true, recommendation };
        },
    },
    {
        name: 'delete_ai_recommendation',
        title: 'Delete AI Recommendation',
        description: 'Delete a recommendation card by id. Destructive. Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string' } },
            required: ['id'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const result = await deleteRecommendation(args.id);
            await auditWrite('MCP_DELETE_AI_RECOMMENDATION', `Deleted AI recommendation ${args.id}`);
            return { ok: true, ...result };
        },
    },
    {
        name: 'create_ai_credit',
        title: 'Create AI Free Credit',
        description: 'Add a free-credits row ({ name, offer?, url?, noCard?, freeApi?, note? }). Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                offer: { type: 'string' },
                url: { type: 'string' },
                noCard: { type: 'boolean' },
                freeApi: { type: 'boolean' },
                note: { type: 'string' },
                displayOrder: { type: 'number' },
            },
            required: ['name'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const credit = await createCredit(args);
            await auditWrite('MCP_CREATE_AI_CREDIT', `Created AI credit "${credit.name}" (${credit._id})`);
            return { ok: true, credit };
        },
    },
    {
        name: 'update_ai_credit',
        title: 'Update AI Free Credit',
        description: 'Update a free-credits row by id. Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                offer: { type: 'string' },
                url: { type: 'string' },
                noCard: { type: 'boolean' },
                freeApi: { type: 'boolean' },
                note: { type: 'string' },
                displayOrder: { type: 'number' },
            },
            required: ['id'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const { id, ...patch } = args;
            const credit = await updateCredit(id, patch);
            await auditWrite('MCP_UPDATE_AI_CREDIT', `Updated AI credit ${id}`);
            return { ok: true, credit };
        },
    },
    {
        name: 'delete_ai_credit',
        title: 'Delete AI Free Credit',
        description: 'Delete a free-credits row by id. Destructive. Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string' } },
            required: ['id'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const result = await deleteCredit(args.id);
            await auditWrite('MCP_DELETE_AI_CREDIT', `Deleted AI credit ${args.id}`);
            return { ok: true, ...result };
        },
    },
    {
        name: 'create_ai_prompt',
        title: 'Create AI Prompt',
        description: 'Add a prompt-library entry ({ title, prompt, role? }). Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                role: { type: 'string' },
                prompt: { type: 'string' },
                displayOrder: { type: 'number' },
            },
            required: ['title', 'prompt'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const prompt = await createPrompt(args);
            await auditWrite('MCP_CREATE_AI_PROMPT', `Created AI prompt "${prompt.title}" (${prompt._id})`);
            return { ok: true, prompt };
        },
    },
    {
        name: 'update_ai_prompt',
        title: 'Update AI Prompt',
        description: 'Update a prompt-library entry by id. Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                role: { type: 'string' },
                prompt: { type: 'string' },
                displayOrder: { type: 'number' },
            },
            required: ['id'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const { id, ...patch } = args;
            const prompt = await updatePrompt(id, patch);
            await auditWrite('MCP_UPDATE_AI_PROMPT', `Updated AI prompt ${id}`);
            return { ok: true, prompt };
        },
    },
    {
        name: 'delete_ai_prompt',
        title: 'Delete AI Prompt',
        description: 'Delete a prompt-library entry by id. Destructive. Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string' } },
            required: ['id'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const result = await deletePrompt(args.id);
            await auditWrite('MCP_DELETE_AI_PROMPT', `Deleted AI prompt ${args.id}`);
            return { ok: true, ...result };
        },
    },
];

export const WRITE_TOOL_NAMES = new Set(WRITE_TOOLS.map((t) => t.name));

/** @typedef {{ name:string, title:string, description:string, arguments:object[], get:(args:object)=>Promise<any> }} McpPrompt */

/** @type {McpPrompt[]} */
export const PROMPTS = [
    {
        name: 'introduce_developer',
        title: 'Introduce the developer',
        description: 'Draft a concise introduction of the developer using the profile and projects.',
        arguments: [{ name: 'tone', description: 'Optional tone, e.g. "formal" or "casual".', required: false }],
        get: async ({ tone } = {}) => ({
            description: 'Introduce the developer',
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Read the aiyu://profile resource and call the list_projects tool, then write a concise${tone ? ` ${tone}` : ''} introduction of the developer that highlights their key skills and most notable projects.`,
                    },
                },
            ],
        }),
    },
];
