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
];

/** @typedef {{ uri:string, name:string, title:string, description:string, mimeType:string, read:()=>Promise<any> }} McpResource */

/** @type {McpResource[]} */
export const RESOURCES = [
    { uri: 'aiyu://profile', name: 'profile', title: 'Developer Profile', description: 'About / resume profile data.', mimeType: 'application/json', read: async () => (await getAboutData()) || {} },
    { uri: 'aiyu://projects', name: 'projects', title: 'Projects', description: 'All portfolio projects.', mimeType: 'application/json', read: async () => (await getProjectsData()) || [] },
    { uri: 'aiyu://blogs', name: 'blogs', title: 'Blog Posts', description: 'Published blog post summaries.', mimeType: 'application/json', read: async () => ((await getPublishedBlogs()) || []).map(blogSummary) },
    { uri: 'aiyu://deployments', name: 'deployments', title: 'Deployments', description: 'Live deployments / hosted apps.', mimeType: 'application/json', read: async () => (await getDeploymentsData()) || [] },
    { uri: 'aiyu://api-catalog', name: 'api-catalog', title: 'API Catalog', description: 'Public REST API catalog.', mimeType: 'application/json', read: async () => getApiCatalog() },
];

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
