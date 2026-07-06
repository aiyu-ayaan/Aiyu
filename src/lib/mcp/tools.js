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
import { toClient, fromClient, getSingleton, upsertSingleton } from '@/lib/serialize';
import cache, { CACHE_KEYS } from '@/lib/cache';
import { logAudit, AUDIT_CATEGORY } from '@/lib/audit';
import { assertMcpWrite, getMcpAuth } from '@/lib/mcp/auth';
import { DEFAULT_AI_PAGE, AI_SECTION_TYPES } from '@/lib/aiPageDefaults';

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

/** Load the stored AI-page config, falling back to the bundled defaults. */
async function loadAiPageConfig() {
    const stored = await getSingleton(prisma, 'aiPage');
    if (!stored || !Array.isArray(stored.sections) || stored.sections.length === 0) {
        return JSON.parse(JSON.stringify(DEFAULT_AI_PAGE));
    }
    return stored;
}

/** Persist a new `sections` array and invalidate the AI-page caches. */
async function saveAiSections(sections) {
    const saved = await upsertSingleton(prisma, 'aiPage', { sections });
    await cache.invalidateAsync(CACHE_KEYS.AI_PAGE);
    await cache.invalidateAsync(`${CACHE_KEYS.AI_PAGE}:stats`);
    return saved;
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

/** Validate a free-form section `data` payload (object, size-bounded). */
function sectionData(value, field = 'data') {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`Field "${field}" must be an object.`);
    }
    if (JSON.stringify(value).length > 100000) {
        throw new Error(`Field "${field}" exceeds 100000 characters.`);
    }
    return value;
}

/** Generate a section id that does not collide with existing ones. */
function uniqueSectionId(base, sections) {
    const taken = new Set(sections.map((s) => s?.id).filter(Boolean));
    const root = slugify(base) || 'section';
    if (!taken.has(root)) return root;
    let i = 2;
    while (taken.has(`${root}-${i}`)) i += 1;
    return `${root}-${i}`;
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
    {
        name: 'create_ai_section',
        title: 'Create AI Hub Section',
        description:
            'Add a new section to the AI Hub (/ai) page. `type` must be one of the supported section types. Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: [...AI_SECTION_TYPES], description: 'Section renderer type.' },
                id: { type: 'string', description: 'Optional stable id; auto-generated from type if omitted.' },
                title: { type: 'string' },
                subtitle: { type: 'string' },
                eyebrow: { type: 'string' },
                accent: { type: 'string', description: 'CSS color, e.g. "var(--accent-cyan)".' },
                enabled: { type: 'boolean', description: 'Defaults to true.' },
                data: { type: 'object', description: 'Type-specific payload (e.g. skills → { categories: [...] }).' },
                index: { type: 'number', description: 'Optional 0-based insertion position; appends by default.' },
            },
            required: ['type'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const type = str(args.type, 'type', { required: true, max: 40 });
            if (!AI_SECTION_TYPES.includes(type)) {
                throw new Error(`Unsupported section type "${type}". Allowed: ${AI_SECTION_TYPES.join(', ')}.`);
            }
            const config = await loadAiPageConfig();
            const sections = [...(config.sections || [])];

            const requestedId = str(args.id, 'id', { max: 120 });
            const id = requestedId ? slugify(requestedId) : uniqueSectionId(type, sections);
            if (sections.some((s) => s?.id === id)) throw new Error(`A section with id "${id}" already exists.`);

            const section = {
                id,
                type,
                enabled: args.enabled === undefined ? true : args.enabled === true,
                eyebrow: str(args.eyebrow, 'eyebrow', { max: 200 }) || '',
                title: str(args.title, 'title', { max: 300 }) || '',
                subtitle: str(args.subtitle, 'subtitle', { max: 1000 }) || '',
                accent: str(args.accent, 'accent', { max: 200 }) || 'var(--accent-cyan)',
                data: sectionData(args.data) || {},
            };

            const at = Number.isFinite(Number(args.index))
                ? Math.max(0, Math.min(sections.length, Number(args.index)))
                : sections.length;
            sections.splice(at, 0, section);

            await saveAiSections(sections);
            await auditWrite('MCP_CREATE_AI_SECTION', `Created AI section "${id}" (type=${type}) at ${at}`);
            return { ok: true, section };
        },
    },
    {
        name: 'update_ai_section',
        title: 'Update AI Hub Section',
        description:
            'Update fields of an existing AI Hub (/ai) section by id. Only the provided fields change; `data` replaces the section payload wholesale. Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                subtitle: { type: 'string' },
                eyebrow: { type: 'string' },
                accent: { type: 'string' },
                enabled: { type: 'boolean' },
                data: { type: 'object', description: 'Replaces the section data payload entirely.' },
            },
            required: ['id'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const id = str(args.id, 'id', { required: true, max: 120 });
            const config = await loadAiPageConfig();
            const sections = [...(config.sections || [])];
            const index = sections.findIndex((s) => s?.id === id);
            if (index === -1) throw new Error(`AI Hub section not found: "${id}".`);

            const patch = {};
            for (const [field, max] of [['title', 300], ['subtitle', 1000], ['eyebrow', 200], ['accent', 200]]) {
                const v = str(args[field], field, { max });
                if (v !== undefined) patch[field] = v;
            }
            if (args.enabled !== undefined) patch.enabled = args.enabled === true;
            if (args.data !== undefined) patch.data = sectionData(args.data);
            if (Object.keys(patch).length === 0) throw new Error('No updatable fields provided.');

            const next = { ...sections[index], ...patch };
            sections[index] = next;

            await saveAiSections(sections);
            await auditWrite('MCP_UPDATE_AI_SECTION', `Updated AI section ${id} [${Object.keys(patch).join(', ')}]`);
            return { ok: true, section: next };
        },
    },
    {
        name: 'delete_ai_section',
        title: 'Delete AI Hub Section',
        description: 'Permanently remove an AI Hub (/ai) section by id. Destructive. Requires write authorization.',
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
            const config = await loadAiPageConfig();
            const sections = (config.sections || []).filter((s) => s?.id !== id);
            if (sections.length === (config.sections || []).length) {
                throw new Error(`AI Hub section not found: "${id}".`);
            }
            await saveAiSections(sections);
            await auditWrite('MCP_DELETE_AI_SECTION', `Deleted AI section "${id}"`);
            return { ok: true, deletedId: id };
        },
    },
    {
        name: 'reorder_ai_sections',
        title: 'Reorder AI Hub Sections',
        description:
            'Set the display order of AI Hub (/ai) sections. `order` must list every existing section id exactly once. Requires write authorization.',
        inputSchema: {
            type: 'object',
            properties: {
                order: { type: 'array', items: { type: 'string' }, description: 'Section ids in the desired order.' },
            },
            required: ['order'],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        handler: async (args = {}) => {
            assertMcpWrite();
            const order = strArray(args.order, 'order');
            if (!order || order.length === 0) throw new Error('Field "order" must be a non-empty array of ids.');
            const config = await loadAiPageConfig();
            const sections = config.sections || [];
            const byId = new Map(sections.map((s) => [s?.id, s]));

            if (order.length !== sections.length || new Set(order).size !== order.length || order.some((id) => !byId.has(id))) {
                throw new Error('`order` must be a permutation of every existing section id (each exactly once).');
            }

            const reordered = order.map((id) => byId.get(id));
            await saveAiSections(reordered);
            await auditWrite('MCP_REORDER_AI_SECTIONS', `Reordered AI sections: ${order.join(', ')}`);
            return { ok: true, order };
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
