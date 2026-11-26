/**
 * Day-one defaults of the MCP server config (the `McpConfig` row). The web build exports them for the Rust server,
 * which merges the stored config over them (server/src/site_api.rs).
 */
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
