import { createHash } from 'crypto';
import { toAbsoluteSiteUrl } from '@/lib/siteUrl';

export const AGENT_LINKS = [
    { href: '/.well-known/api-catalog', rel: 'api-catalog', type: 'application/linkset+json' },
    { href: '/.well-known/openapi.json', rel: 'service-desc', type: 'application/openapi+json' },
    { href: '/docs/api', rel: 'service-doc', type: 'text/markdown' },
    { href: '/.well-known/oauth-protected-resource', rel: 'describedby', type: 'application/json' },
    { href: '/.well-known/agent-skills/index.json', rel: 'describedby', type: 'application/json' },
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

## Public Resources

- Projects: /projects
- Blogs: /blogs
- Apps: /apps
- Gallery: /gallery
- GitHub stats: /github
- Live deployments: /apps
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

Each of the four AI Hub sections is independently CRUD-able. Writes (POST/PUT/DELETE) require an admin session cookie OR an Authorization: Bearer <token> header (the blog API token from /admin/api-reference). Reads above are public.

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
        // Agent registration metadata (auth.md / WorkOS agent_auth). Aiyu issues
        // long-lived bearer tokens for agent write access manually from the
        // admin API reference page rather than via dynamic client registration, so
        // register_uri points agents at that flow and its docs.
        agent_auth: {
            enabled: true,
            registration_metadata: toAbsoluteSiteUrl('/auth.md'),
            register_uri: toAbsoluteSiteUrl('/admin/api-reference'),
            identity_types_supported: ['agent', 'admin'],
            credential_types_supported: ['bearer_token', 'session_cookie'],
            bearer_methods_supported: ['header'],
            claims_uri: toAbsoluteSiteUrl('/.well-known/oauth-protected-resource'),
            revocation_uri: toAbsoluteSiteUrl('/admin/api-reference'),
            documentation_uri: toAbsoluteSiteUrl('/docs/api'),
        },
    };
}

export function getAuthMarkdown() {
    const base = toAbsoluteSiteUrl('');

    return `# Agent Authentication — Aiyu

This document describes how AI agents register for and use credentials with the
Aiyu portfolio API. It follows the auth.md convention. Machine-readable metadata
lives in the OAuth discovery documents linked below.

- Issuer / authorization server: ${toAbsoluteSiteUrl('/.well-known/oauth-authorization-server')}
- Protected resource metadata: ${toAbsoluteSiteUrl('/.well-known/oauth-protected-resource')}
- API documentation: ${toAbsoluteSiteUrl('/docs/api')}

## Access Tiers

- **Public reads** — All \`GET\` endpoints under \`/api\` are open. No credential
  is required. Start here; most portfolio content is readable without auth.
- **Agent writes** — Write endpoints (\`POST\`/\`PUT\`/\`DELETE\`) under
  \`/api/ai/*\` require a bearer token.
- **Admin** — Routes under \`/api/admin\` require an interactive admin session
  cookie and are not available to autonomous agents.

## Identity Types

- \`agent\` — An autonomous client acting via a bearer token.
- \`admin\` — The site owner, via an interactive session cookie.

## Credential Types

- \`bearer_token\` — Presented as \`Authorization: Bearer <token>\`. This is the
  credential agents use for write access.
- \`session_cookie\` — Interactive admin sessions only.

## Registration

Aiyu does not offer dynamic client registration. Agent bearer tokens are minted
by the site owner in the admin panel:

1. Owner opens ${toAbsoluteSiteUrl('/admin/api-reference')}.
2. Owner generates an API token and shares it with the agent operator out of band.
3. The agent sends the token on every write request:

   \`\`\`http
   POST ${base}/api/ai/skills/items
   Authorization: Bearer <token>
   Content-Type: application/json
   \`\`\`

## Revocation

Tokens are revoked or regenerated in
${toAbsoluteSiteUrl('/admin/api-reference')}. A revoked token is rejected immediately.

## Claims & Scopes

Supported scopes: \`public:read\`, \`contact:write\`, \`admin:read\`,
\`admin:write\`. Per-resource claims are published at
${toAbsoluteSiteUrl('/.well-known/oauth-protected-resource')}.
`;
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
