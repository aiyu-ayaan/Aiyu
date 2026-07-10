/**
 * MCP (Model Context Protocol) server config — the single source of truth for
 * the server card served at `/.well-known/mcp/server-card.json`.
 *
 * The config lives in the `McpConfig` json-blob singleton (see
 * prisma/schema.prisma + lib/serialize.js). The admin panel edits every field;
 * the discovery route reads it through `getMcpConfig()`, which falls back to
 * DEFAULT_MCP_CONFIG when the row is missing or the DB is unavailable — so the
 * published server card is identical to the old hardcoded one until an admin
 * edits it.
 *
 * `buildMcpServerCard()` is a pure function (no DB) that turns a config object
 * into the wire-shape server card, resolving relative endpoints/links to
 * absolute site URLs. It is safe to import in tests and from agentDiscovery.
 */
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import { toAbsoluteSiteUrl } from '@/lib/siteUrl';
import cache from '@/lib/cache';
import { builtinToolCards } from '@/lib/mcp/tools';

// Day-one defaults — reproduce the previously hardcoded server card exactly so
// output is unchanged until an admin saves the form.
export const DEFAULT_MCP_CONFIG = {
    enabled: true,
    server: {
        name: 'aiyu',
        version: '1.0.0',
        title: 'Aiyu',
        description: 'Aiyu portfolio MCP server for agent discovery and browser-exposed tools.',
        websiteUrl: '',
        instructions: '',
    },
    transports: [
        { type: 'streamable-http', endpoint: '/api/mcp', description: 'Standard MCP StreamableHTTP endpoint (JSON-RPC over HTTP).' },
        { type: 'webmcp', endpoint: '/', description: 'Browser WebMCP tools registered on the live site.' },
    ],
    capabilities: {
        tools: { enabled: true, listChanged: false },
        resources: { enabled: true, subscribe: false, listChanged: false },
        prompts: { enabled: true, listChanged: false },
        logging: { enabled: false },
        completions: { enabled: false },
    },
    tools: [
        {
            name: 'aiyu.navigate',
            title: 'Navigate',
            description: 'Navigate to a primary Aiyu portfolio page.',
            enabled: true,
            inputSchema: '',
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        {
            name: 'aiyu.search',
            title: 'Search',
            description: 'Search public Aiyu content through the global search API.',
            enabled: true,
            inputSchema: '',
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        {
            name: 'aiyu.getPublicApiCatalog',
            title: 'Get Public API Catalog',
            description: 'Fetch the Aiyu API catalog for automated API discovery.',
            enabled: true,
            inputSchema: '',
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
    ],
    resources: [],
    prompts: [],
    links: [
        { name: 'apiCatalog', url: '/.well-known/api-catalog' },
        { name: 'documentation', url: '/docs/api' },
        { name: 'mcpDocumentation', url: '/docs/mcp' },
    ],
};

const CACHE_KEY = 'db:mcpconfig:singleton';
const CACHE_TTL = 60_000;

const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

function mergeServer(stored) {
    const s = asObject(stored);
    return { ...DEFAULT_MCP_CONFIG.server, ...s };
}

function mergeCapabilities(stored) {
    const c = asObject(stored);
    const d = DEFAULT_MCP_CONFIG.capabilities;
    return {
        tools: { ...d.tools, ...asObject(c.tools) },
        resources: { ...d.resources, ...asObject(c.resources) },
        prompts: { ...d.prompts, ...asObject(c.prompts) },
        logging: { ...d.logging, ...asObject(c.logging) },
        completions: { ...d.completions, ...asObject(c.completions) },
    };
}

function mergeTool(tool) {
    const t = asObject(tool);
    return {
        name: String(t.name || ''),
        title: String(t.title || ''),
        description: String(t.description || ''),
        enabled: t.enabled !== false,
        inputSchema: typeof t.inputSchema === 'string' ? t.inputSchema : '',
        annotations: {
            readOnlyHint: !!t.annotations?.readOnlyHint,
            destructiveHint: !!t.annotations?.destructiveHint,
            idempotentHint: !!t.annotations?.idempotentHint,
            openWorldHint: !!t.annotations?.openWorldHint,
        },
    };
}

function mergeResource(resource) {
    const r = asObject(resource);
    return {
        uri: String(r.uri || ''),
        name: String(r.name || ''),
        title: String(r.title || ''),
        description: String(r.description || ''),
        mimeType: String(r.mimeType || ''),
        enabled: r.enabled !== false,
    };
}

function mergePrompt(prompt) {
    const p = asObject(prompt);
    return {
        name: String(p.name || ''),
        title: String(p.title || ''),
        description: String(p.description || ''),
        enabled: p.enabled !== false,
        arguments: asArray(p.arguments).map((arg) => {
            const a = asObject(arg);
            return {
                name: String(a.name || ''),
                description: String(a.description || ''),
                required: !!a.required,
            };
        }),
    };
}

function mergeTransport(transport) {
    const t = asObject(transport);
    return {
        type: String(t.type || 'webmcp'),
        endpoint: String(t.endpoint || ''),
        description: String(t.description || ''),
    };
}

function mergeLink(link) {
    const l = asObject(link);
    return { name: String(l.name || ''), url: String(l.url || '') };
}

/**
 * Deep-ish merge that keeps the DEFAULT shape when stored data omits sections.
 * Arrays (tools/resources/prompts/transports/links) are taken from the stored
 * config when present, else from defaults, then normalized per-entry.
 */
export function mergeMcpConfig(stored = {}) {
    const data = asObject(stored);
    const transports = ('transports' in data ? asArray(data.transports) : DEFAULT_MCP_CONFIG.transports).map(mergeTransport);
    const tools = ('tools' in data ? asArray(data.tools) : DEFAULT_MCP_CONFIG.tools).map(mergeTool);
    const links = ('links' in data ? asArray(data.links) : DEFAULT_MCP_CONFIG.links).map(mergeLink);
    const write = asObject(data.write);
    return {
        enabled: data.enabled !== false,
        server: mergeServer(data.server),
        transports,
        capabilities: mergeCapabilities(data.capabilities),
        tools,
        resources: asArray(data.resources).map(mergeResource),
        prompts: asArray(data.prompts).map(mergePrompt),
        links,
        // Write access is OFF by default — writes require BOTH this switch and a
        // valid bearer token (see lib/mcp/auth.js). tokenLast4/tokenUpdatedAt are
        // display metadata surfaced by the admin config route from dedicated columns.
        write: { enabled: write.enabled === true },
    };
}

/** Parse a tool's stored inputSchema JSON string; ignore blanks/invalid JSON. */
function parseInputSchema(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

function toCardTool(tool) {
    const out = { name: tool.name };
    if (tool.title) out.title = tool.title;
    if (tool.description) out.description = tool.description;
    const schema = parseInputSchema(tool.inputSchema);
    if (schema) out.inputSchema = schema;
    const ann = tool.annotations || {};
    const annotations = {};
    for (const key of ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint']) {
        if (ann[key]) annotations[key] = true;
    }
    if (Object.keys(annotations).length) out.annotations = annotations;
    return out;
}

function toCardResource(resource, resolveUrl) {
    const out = { uri: resolveUrl(resource.uri), name: resource.name || resource.uri };
    if (resource.title) out.title = resource.title;
    if (resource.description) out.description = resource.description;
    if (resource.mimeType) out.mimeType = resource.mimeType;
    return out;
}

function toCardPrompt(prompt) {
    const out = { name: prompt.name };
    if (prompt.title) out.title = prompt.title;
    if (prompt.description) out.description = prompt.description;
    if (prompt.arguments.length) {
        out.arguments = prompt.arguments.map((a) => {
            const arg = { name: a.name };
            if (a.description) arg.description = a.description;
            if (a.required) arg.required = true;
            return arg;
        });
    }
    return out;
}

/**
 * Build the wire-shape MCP server card from a config object. Pure (no DB).
 * `resolveUrl` maps relative endpoints/links to absolute site URLs; defaults to
 * `toAbsoluteSiteUrl` so callers usually pass nothing.
 */
export function buildMcpServerCard(config, resolveUrl = toAbsoluteSiteUrl) {
    const cfg = mergeMcpConfig(config);
    const resolve = (value) => {
        const v = String(value || '');
        if (!v) return v;
        return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : resolveUrl(v);
    };

    const serverInfo = { name: cfg.server.name, version: cfg.server.version };
    if (cfg.server.title) serverInfo.title = cfg.server.title;
    if (cfg.server.description) serverInfo.description = cfg.server.description;
    if (cfg.server.websiteUrl) serverInfo.websiteUrl = resolve(cfg.server.websiteUrl);

    const capabilities = {};
    if (cfg.capabilities.tools.enabled) {
        // The card must advertise every tool the /api/mcp endpoint actually
        // serves (its tools/list comes from lib/mcp/tools.js), so built-ins are
        // merged in automatically; the configured list curates extras like the
        // browser WebMCP tools and may override a built-in by name.
        const configured = cfg.tools.filter((t) => t.enabled && t.name).map(toCardTool);
        const configuredNames = new Set(configured.map((t) => t.name));
        capabilities.tools = {
            listChanged: !!cfg.capabilities.tools.listChanged,
            tools: [...configured, ...builtinToolCards().filter((t) => !configuredNames.has(t.name))],
        };
    }
    if (cfg.capabilities.resources.enabled) {
        const resources = cfg.resources.filter((r) => r.enabled && r.uri).map((r) => toCardResource(r, resolve));
        capabilities.resources = {
            subscribe: !!cfg.capabilities.resources.subscribe,
            listChanged: !!cfg.capabilities.resources.listChanged,
            ...(resources.length ? { resources } : {}),
        };
    }
    if (cfg.capabilities.prompts.enabled) {
        const prompts = cfg.prompts.filter((p) => p.enabled && p.name).map(toCardPrompt);
        capabilities.prompts = {
            listChanged: !!cfg.capabilities.prompts.listChanged,
            ...(prompts.length ? { prompts } : {}),
        };
    }
    if (cfg.capabilities.logging.enabled) capabilities.logging = {};
    if (cfg.capabilities.completions.enabled) capabilities.completions = {};

    const links = {};
    for (const link of cfg.links) {
        if (link.name && link.url) links[link.name] = resolve(link.url);
    }

    const card = {
        serverInfo,
        transports: cfg.transports
            .filter((t) => t.type)
            .map((t) => ({
                type: t.type,
                endpoint: resolve(t.endpoint),
                ...(t.description ? { description: t.description } : {}),
            })),
        capabilities,
        links,
    };
    if (cfg.server.instructions) card.instructions = cfg.server.instructions;
    return card;
}

/**
 * Read the merged MCP config (never throws — falls back to defaults). Cached so
 * server-card reads under discovery traffic don't hammer the DB.
 */
export async function getMcpConfig() {
    try {
        return await cache.getOrSet(CACHE_KEY, async () => {
            const stored = await getSingleton(prisma, 'mcpConfig');
            return mergeMcpConfig(stored || {});
        }, CACHE_TTL);
    } catch (error) {
        console.warn('[mcpConfig] read failed, using defaults:', error.message);
        return mergeMcpConfig({});
    }
}

/** Build the published server card straight from the DB-backed config. */
export async function getMcpServerCard() {
    const config = await getMcpConfig();
    return buildMcpServerCard(config);
}

/** Drop the cached MCP config after an admin mutation. */
export async function invalidateMcpConfig() {
    await cache.invalidatePrefixAsync('db:mcpconfig');
}
