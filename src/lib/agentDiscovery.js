import { createHash } from 'crypto';
import { toAbsoluteSiteUrl } from '@/lib/siteUrl';

export const AGENT_LINKS = [
    { href: '/.well-known/api-catalog', rel: 'api-catalog', type: 'application/linkset+json' },
    { href: '/.well-known/openapi.json', rel: 'service-desc', type: 'application/openapi+json' },
    { href: '/docs/api', rel: 'service-doc', type: 'text/markdown' },
    { href: '/docs/mcp', rel: 'service-doc', type: 'text/markdown' },
    { href: '/.well-known/oauth-protected-resource', rel: 'describedby', type: 'application/json' },
    { href: '/.well-known/agent-skills/index.json', rel: 'describedby', type: 'application/json' },
    { href: '/.well-known/mcp/server-card.json', rel: 'describedby', type: 'application/json' },
];

export function formatLinkHeader(links = AGENT_LINKS) {
    return links
        .map((link) => {
            const parts = [`<${link.href}>`, `rel="${link.rel}"`];
            if (link.type) parts.push(`type="${link.type}"`);
            return parts.join('; ');
        })
        .join(', ');
}

export const HOME_MARKDOWN = `# Aiyu Portfolio

Aiyu is a developer portfolio for projects, writing, live deployments, gallery entries, and contact workflows.

## Agent Discovery

- API catalog: /.well-known/api-catalog
- OpenAPI description: /.well-known/openapi.json
- API documentation: /docs/api
- Health status: /api/health
- OAuth protected resource metadata: /.well-known/oauth-protected-resource
- Agent skills index: /.well-known/agent-skills/index.json
- MCP server card: /.well-known/mcp/server-card.json

## Public Resources

- Projects: /projects
- Blogs: /blogs
- Apps: /apps
- Gallery: /gallery
- GitHub stats: /github
- Live deployments: /live-deployments
- Contact: /contact-us

## Public API Highlights

- GET /api/health
- GET /api/home
- GET /api/about
- GET /api/projects
- GET /api/blogs
- GET /api/gallery
- GET /api/deployments
- GET /api/github/stats
- GET /api/ai-page
- GET /api/ai/skills
- GET /api/ai/recommendations
- GET /api/ai/credits
- GET /api/ai/prompts
- POST /api/contact/message
`;

export function getMarkdownTokenEstimate(markdown = HOME_MARKDOWN) {
    return String(markdown.trim().split(/\s+/).filter(Boolean).length);
}

export function getApiDocsMarkdown() {
    return `# Aiyu API Documentation

This service exposes public portfolio APIs and protected admin APIs.

## Discovery

- API catalog: ${toAbsoluteSiteUrl('/.well-known/api-catalog')}
- OpenAPI description: ${toAbsoluteSiteUrl('/.well-known/openapi.json')}
- Health endpoint: ${toAbsoluteSiteUrl('/api/health')}
- OAuth protected resource metadata: ${toAbsoluteSiteUrl('/.well-known/oauth-protected-resource')}

## Public Endpoints

- GET /api/health - Returns service health and optional deep database status with ?deep=1.
- GET /api/home - Returns homepage content.
- GET /api/about - Returns about/profile content.
- GET /api/projects - Lists public projects.
- GET /api/blogs - Lists public blog posts.
- GET /api/gallery - Lists gallery items.
- GET /api/deployments - Lists live deployments.
- GET /api/github/stats - Returns configured GitHub statistics.
- GET /api/ai-page - Returns the whole AI Hub (/ai) page: ordered section skeleton with the four content sections hydrated.
- GET /api/ai/skills - Skills grouped by category: { categories: [{ id, label, accent, items: [{ id, name, description, url? }] }] }.
- GET /api/ai/recommendations - Recommended-stack cards: { cards: [{ id, name, url, rating, accent, blurb, tags }] }.
- GET /api/ai/credits - Free credits / free tiers: { rows: [{ id, name, offer, url, noCard, freeApi, note }] }.
- GET /api/ai/prompts - Prompt library: { items: [{ id, title, role, prompt }] }.
- GET /api/ai/layout - The page skeleton (section order, shells, hero/stats) without hydrated content.
- POST /api/contact/message - Submits a contact message.

## AI Hub Content — Write Endpoints

Each of the four AI Hub sections is independently CRUD-able. Writes (POST/PUT/DELETE) require an admin session cookie OR an Authorization: Bearer <token> header (the MCP write token or blog API token from /admin/mcp and /admin/api-reference). Reads above are public.

- Skills: POST /api/ai/skills/categories, PUT|DELETE /api/ai/skills/categories/{id}; POST /api/ai/skills/items, PUT|DELETE /api/ai/skills/items/{id}.
- Recommendations: POST /api/ai/recommendations, PUT|DELETE /api/ai/recommendations/{id}.
- Credits: POST /api/ai/credits, PUT|DELETE /api/ai/credits/{id}.
- Prompts: POST /api/ai/prompts, PUT|DELETE /api/ai/prompts/{id}.
- Layout: PUT /api/ai/layout (section order/visibility/headings). POST /api/ai/seed backfills empty sections from defaults.

## Protected Endpoints

Admin routes under /api/admin require the site's session cookie. Agents can discover the protected resource metadata at /.well-known/oauth-protected-resource. The current production application uses cookie-based admin sessions; OAuth/OIDC metadata is published for discovery and future token-based integrations.

## Source Documentation

Complete project API notes are maintained in the repository wiki:
https://github.com/aiyu-ayaan/Aiyu/wiki/API-Documentation
`;
}

export function getMcpDocsMarkdown() {
    return `# Model Context Protocol (MCP) & API Integration Guide

Welcome to the Aiyu Model Context Protocol (MCP) and API Integration Guide. This document provides a complete walkthrough of how to use and configure the MCP Server capabilities in your dashboard and how to consume or expose your resume/portfolio data to AI agents.

---

## 1. What is Model Context Protocol (MCP)?

The **Model Context Protocol (MCP)** is an open standard developed by Anthropic that enables Large Language Models (LLMs) and AI agents to connect securely to data sources and tools. 

Instead of writing custom API integration code for every single AI client, tool, or browser sandbox, MCP provides a unified way to describe:
- **Resources**: Data sources that an AI agent can read (similar to files or endpoints).
- **Tools**: Dynamic functions that an AI agent can execute (similar to calling a function).
- **Prompts**: Injected prompt templates or instructions that guide the AI agent's behavior.

When an AI agent (such as Claude Desktop, a browser-based agent, or Antigravity) connects to Aiyu, it discovers these capabilities automatically via a published **Server Card** served at \`/.well-known/mcp/server-card.json\`.

---

## 2. Using the \`/admin/mcp\` Dashboard

The \`/admin/mcp\` Command Center module is the control panel for your portfolio's MCP Server. It is split into seven configuration sections:

### 1. Server
This section sets the main metadata for your MCP Server.
- **Enabled Switch**: Master toggle. If disabled, the server card is still served, but no active tools or resources will be advertised.
- **Name**: Machine-readable identifier for your server (e.g., \`aiyu\`).
- **Version**: Version of your integration (e.g., \`1.0.0\`).
- **Title**: Display name shown to connecting clients (e.g., \`Aiyu\`).
- **Website URL**: Absolute link to your site.
- **Description**: High-level explanation of what your server does.
- **Instructions**: Guidelines sent directly to the connecting AI agent, advising it on *how* to use the server. This is a powerful way to steer the agent's behavior (e.g., "Always search the blog posts before answering general queries about the developer.").

### 2. Transports
Transports define *how* clients communicate with your MCP Server. Aiyu supports:
- **\`webmcp\`**: Direct, browser-level integration. When an agent is running inside the user's browser, Aiyu registers its tools directly to the browser runtime via \`navigator.modelContext\`.
- **\`sse\` (Server-Sent Events)**: Exposes a live streaming endpoint. Best for server-to-server connections where clients listen for updates and send actions over HTTP.
- **\`http\` / \`streamable-http\`**: Standard HTTP POST/GET endpoint structure.
- **\`stdio\`**: Standard input/output transport, used primarily when running Aiyu locally via command line.

### 3. Capabilities
Toggle which features of MCP are advertised to clients:
- **Tools**: Enable function calling.
- **Resources**: Enable reading raw data resources.
- **Prompts**: Enable loading prompt templates.
- **Logging**: Enable forwarding log events to the client.
- **Completions**: Enable auto-completing arguments.

### 4. Tools
Define the actions that AI agents can take on your site. Each tool has:
- **Name**: The identifier (e.g., \`aiyu.navigate\`).
- **Title / Description**: Details that help the LLM decide when to call the tool.
- **Input Schema**: A JSON schema representing the arguments the tool expects. For example:
  \`\`\`json
  {
    "type": "object",
    "properties": {
      "query": { "type": "string" }
    },
    "required": ["query"]
  }
  \`\`\`
- **Annotations**: Flags like \`readOnlyHint\` (safe to call), \`destructiveHint\` (requires confirmation), or \`idempotentHint\` (safe to retry).

### 5. Resources
Expose read-only documents to the AI.
- **URI**: A unique URI string identifying the resource (e.g., \`about://resume\` or \`http://localhost:3000/api/about\`).
- **Name & Title**: Text describing the resource.
- **MimeType**: Identifies content structure (e.g., \`application/json\` or \`text/markdown\`).

### 6. Prompts
Define reusable system instructions that the user or agent can select (e.g., \`write_cover_letter\` prompt with arguments like \`companyName\` and \`position\`).

### 7. Links
Provide links that help agents discover API catalogs (\`/.well-known/api-catalog\`) or OpenAPI definitions (\`/.well-known/openapi.json\`).

---

## 3. How to Use & Expose Your Resume over API

Your resume and profile information are managed in the database via the **About** singleton and associated relational tables (Projects, Blogs). You can consume these via the REST API or configure them as MCP Resources.

### Method A: Consuming Resume Data via the REST API

You or your agent can query the portfolio content directly using the following public JSON endpoints:

1. **Get Resume Biography & Skills**:
   - **Endpoint**: \`GET /api/about\`
   - **Description**: Returns your bio, career history, education, and skill lists.
   - **Response Format**:
     \`\`\`json
     {
       "id": "cuid...",
       "data": {
         "name": "Your Name",
         "title": "Software Engineer",
         "bio": "...",
         "skills": ["React", "Next.js", "PostgreSQL"],
         "experience": [
           { "role": "Senior Developer", "company": "Tech Corp", "years": "2024-Present" }
         ]
       }
     }
     \`\`\`

2. **Get Projects**:
   - **Endpoint**: \`GET /api/projects\`
   - **Description**: Returns all public projects, including status, tech stacks, and live urls.

3. **Get GitHub Stats**:
   - **Endpoint**: \`GET /api/github/stats\`
   - **Description**: Returns the public stats configured in your GitHub module.

---

### Method B: Exposing Resume Data via MCP Resources

To make your resume immediately readable by any MCP-compliant AI client, follow these steps in the \`/admin/mcp\` panel:

1. Navigate to the **Resources** tab in \`/admin/mcp\`.
2. Click **+ RESOURCE**.
3. Configure the fields as follows:
   - **URI**: \`about://resume\`
   - **Enabled**: \`ON\`
   - **Name**: \`resume\`
   - **Title**: \`Developer Resume & Biography\`
   - **MimeType**: \`application/json\`
   - **Description**: \`Fetches the primary developer bio, career history, and skill list.\`
4. Click **SAVE** at the top right.

When an AI agent connects to your server card, it will find \`about://resume\` listed as an available resource. It can then request a resource read to ingest your full resume instantly.

---

### Method C: Connecting External Clients (e.g., Claude Desktop)

To connect an external client like **Claude Desktop** directly to your portfolio's MCP Server so it can access your resume:

1. Open your Claude Desktop configuration file:
   - **Windows**: \`%%APPDATA%%\\Claude\\claude_desktop_config.json\`
   - **Mac**: \`~/Library/Application Support/Claude/claude_desktop_config.json\`
2. Add your Aiyu MCP server under the \`mcpServers\` key using our stdio server script:
   \`\`\`json
   {
     "mcpServers": {
       "aiyu-portfolio": {
         "command": "node",
         "args": [
           "--env-file=.env",
           "/absolute/path/to/aiyu/scripts/mcp-server.mjs"
         ]
       }
     }
   }
   \`\`\`
3. Alternatively, if your client supports remote HTTP/SSE servers, you can configure it to connect directly to your hosted \`/api/mcp/sse\` endpoint (once implemented) or fetch the \`server-card.json\` file for dynamic configuration.

---

## 4. Editing the AI Hub (\`/ai\`) Page over MCP

The public **AI Hub** page has four curated content sections — **Skills**, **Recommendations**, **Free Credits**, and **Prompt library** — each backed by its own relational table and independently CRUD-able. MCP exposes per-section read tools (public) and write tools (guarded), mirroring the REST surface under \`/api/ai/*\`. The page *skeleton* (section order, headings, hero/stats) lives in the \`aiPage\` singleton and is read via \`get_ai_page\`.

### Read tools (public, no auth)

- **\`get_ai_page\`** — the whole page: ordered section skeleton with the four content sections hydrated. Resource \`aiyu://ai-page\`, REST \`GET /api/ai-page\`.
- **\`list_ai_skills\`** — \`{ categories: [{ id, label, accent, items: [{ id, name, description, url? }] }] }\`. Resource \`aiyu://ai-skills\`, REST \`GET /api/ai/skills\`.
- **\`list_ai_recommendations\`** — \`{ cards: [{ id, name, url, rating, accent, blurb, tags }] }\`. Resource \`aiyu://ai-recommendations\`, REST \`GET /api/ai/recommendations\`.
- **\`list_ai_credits\`** — \`{ rows: [{ id, name, offer, url, noCard, freeApi, note }] }\`. Resource \`aiyu://ai-credits\`, REST \`GET /api/ai/credits\`.
- **\`list_ai_prompts\`** — \`{ items: [{ id, title, role, prompt }] }\`. Resource \`aiyu://ai-prompts\`, REST \`GET /api/ai/prompts\`.

### Write tools (require authorization)

Writes require the MCP **write access** switch enabled in \`/admin/mcp\` **and** an \`Authorization: Bearer <token>\` header on every request (mint the token in \`/admin/mcp\`). Each write validates its input, persists to the section's table, invalidates the page cache, and records an audit-log entry. Every field except \`id\` is optional on update; only supplied fields change.

- **Skills** — \`create_ai_skill_category { label, accent? }\`, \`update_ai_skill_category { id, label?, accent? }\`, \`delete_ai_skill_category { id }\` (cascades its skills); \`create_ai_skill { categoryId, name, description?, url? }\`, \`update_ai_skill { id, categoryId?, name?, description?, url? }\`, \`delete_ai_skill { id }\`.
- **Recommendations** — \`create_ai_recommendation { name, url?, rating?, accent?, blurb?, tags? }\`, \`update_ai_recommendation { id, … }\`, \`delete_ai_recommendation { id }\`.
- **Free Credits** — \`create_ai_credit { name, offer?, url?, noCard?, freeApi?, note? }\`, \`update_ai_credit { id, … }\`, \`delete_ai_credit { id }\`.
- **Prompts** — \`create_ai_prompt { title, prompt, role? }\`, \`update_ai_prompt { id, … }\`, \`delete_ai_prompt { id }\`.

### Typical editing flow

1. \`list_ai_skills\` (or the section you want) → find the item \`id\`.
2. \`update_ai_skill { id, description }\` — patch just the fields you want, or \`create_ai_skill { categoryId, name }\` to add one.
3. Reload \`/ai\` — changes are live once the write invalidates the cache.

> The old generic \`create/update/delete/reorder_ai_section\` tools and \`PUT /api/ai-page\` were removed in favor of these per-section endpoints. Section order/visibility is set with \`PUT /api/ai/layout\`.
`;
}

export function getOpenApiDocument() {
    const baseUrl = toAbsoluteSiteUrl('');

    return {
        openapi: '3.1.0',
        info: {
            title: 'Aiyu Public API',
            version: '1.0.0',
            description: 'Public portfolio API endpoints for Aiyu.',
        },
        servers: [{ url: baseUrl }],
        paths: {
            '/api/health': {
                get: {
                    summary: 'Service health check',
                    parameters: [
                        {
                            name: 'deep',
                            in: 'query',
                            required: false,
                            schema: { type: 'string', enum: ['1'] },
                            description: 'Run database connectivity checks when set to 1.',
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Healthy or shallow health response.',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
                        },
                        503: { description: 'Deep health check failed.' },
                    },
                },
            },
            '/api/home': { get: publicJsonOperation('Homepage content') },
            '/api/about': { get: publicJsonOperation('About/profile content') },
            '/api/projects': { get: publicJsonOperation('Public project list') },
            '/api/blogs': { get: publicJsonOperation('Public blog list') },
            '/api/gallery': { get: publicJsonOperation('Public gallery list') },
            '/api/deployments': { get: publicJsonOperation('Live deployment list') },
            '/api/github/stats': { get: publicJsonOperation('GitHub statistics') },
            '/api/ai-page': { get: publicJsonOperation('AI Hub page (ordered sections, content hydrated)') },
            '/api/ai/skills': { get: publicJsonOperation('AI skills grouped by category') },
            '/api/ai/recommendations': { get: publicJsonOperation('Recommended AI stack cards') },
            '/api/ai/credits': { get: publicJsonOperation('Free credits & free tiers') },
            '/api/ai/prompts': { get: publicJsonOperation('Prompt library') },
            '/api/contact/message': {
                post: {
                    summary: 'Submit a contact message',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        email: { type: 'string', format: 'email' },
                                        message: { type: 'string' },
                                    },
                                    required: ['name', 'email', 'message'],
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Message accepted.' },
                        400: { description: 'Invalid request.' },
                        429: { description: 'Rate limited.' },
                    },
                },
            },
        },
        components: {
            schemas: {
                HealthResponse: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        mode: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        uptime: { type: 'number' },
                        responseTimeMs: { type: 'number' },
                        checks: { type: 'object' },
                    },
                    required: ['status', 'mode', 'timestamp'],
                },
            },
        },
    };
}

function publicJsonOperation(summary) {
    return {
        summary,
        responses: {
            200: {
                description: 'Successful JSON response.',
                content: {
                    'application/json': {
                        schema: {},
                    },
                },
            },
        },
    };
}

export function getApiCatalog() {
    const apiAnchor = toAbsoluteSiteUrl('/api');

    return {
        linkset: [
            {
                anchor: apiAnchor,
                'service-desc': [
                    {
                        href: toAbsoluteSiteUrl('/.well-known/openapi.json'),
                        type: 'application/openapi+json',
                    },
                ],
                'service-doc': [
                    {
                        href: toAbsoluteSiteUrl('/docs/api'),
                        type: 'text/markdown',
                    },
                    {
                        href: 'https://github.com/aiyu-ayaan/Aiyu/wiki/API-Documentation',
                        type: 'text/html',
                    },
                ],
                status: [
                    {
                        href: toAbsoluteSiteUrl('/api/health'),
                        type: 'application/json',
                    },
                ],
            },
        ],
    };
}

export function getOAuthIssuerMetadata() {
    const issuer = toAbsoluteSiteUrl('');

    return {
        issuer,
        authorization_endpoint: toAbsoluteSiteUrl('/admin/login'),
        token_endpoint: toAbsoluteSiteUrl('/api/auth/login'),
        jwks_uri: toAbsoluteSiteUrl('/.well-known/jwks.json'),
        grant_types_supported: ['password'],
        response_types_supported: ['token'],
        scopes_supported: ['public:read', 'contact:write', 'admin:read', 'admin:write'],
        token_endpoint_auth_methods_supported: ['none'],
        service_documentation: toAbsoluteSiteUrl('/docs/api'),
    };
}

export function getProtectedResourceMetadata() {
    return {
        resource: toAbsoluteSiteUrl('/api'),
        authorization_servers: [toAbsoluteSiteUrl('')],
        scopes_supported: ['public:read', 'contact:write', 'admin:read', 'admin:write'],
        bearer_methods_supported: ['header'],
        resource_documentation: toAbsoluteSiteUrl('/docs/api'),
    };
}

export function getJwks() {
    return {
        keys: [],
    };
}

export const AGENT_SKILL_ARTIFACTS = {
    'aiyu-api-discovery': `# Aiyu API Discovery

Use this skill to discover and consume the Aiyu portfolio APIs.

## Discovery

1. Fetch /.well-known/api-catalog.
2. Follow service-desc to /.well-known/openapi.json for endpoint shapes.
3. Follow service-doc to /docs/api for human-readable API notes.
4. Check /api/health before performing workflows that depend on live data.

## Useful Public Endpoints

- GET /api/projects
- GET /api/blogs
- GET /api/gallery
- GET /api/deployments
- GET /api/ai/skills
- GET /api/ai/recommendations
- GET /api/ai/credits
- GET /api/ai/prompts
- POST /api/contact/message
`,
    'aiyu-site-navigation': `# Aiyu Site Navigation

Use this skill to navigate the Aiyu portfolio as an agent.

## Primary Pages

- /projects for portfolio projects.
- /blogs for writing.
- /apps for apps.
- /gallery for gallery entries.
- /github for GitHub stats.
- /contact-us for contact workflows.

## Browser Tools

When WebMCP is available, use the exposed navigation and search tools before scraping page internals.
`,
};

export function getAgentSkillsIndex() {
    return {
        $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
        skills: Object.entries(AGENT_SKILL_ARTIFACTS).map(([name, content]) => ({
            name,
            type: 'skill-md',
            description: name === 'aiyu-api-discovery'
                ? 'Discover and consume Aiyu public portfolio APIs.'
                : 'Navigate Aiyu portfolio pages and browser-exposed tools.',
            url: toAbsoluteSiteUrl(`/.well-known/agent-skills/${name}/SKILL.md`),
            digest: `sha256:${createHash('sha256').update(content).digest('hex')}`,
        })),
    };
}

// The MCP server card is now admin-configurable and served from the DB-backed
// singleton — see lib/mcpConfig.js (getMcpServerCard / buildMcpServerCard),
// consumed by /.well-known/mcp/server-card.json.
