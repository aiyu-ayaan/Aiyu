import { createHash } from 'crypto';
import { toAbsoluteSiteUrl } from '@/lib/siteUrl';

export const AGENT_LINKS = [
    { href: '/.well-known/api-catalog', rel: 'api-catalog', type: 'application/linkset+json' },
    { href: '/.well-known/openapi.json', rel: 'service-desc', type: 'application/openapi+json' },
    { href: '/docs/api', rel: 'service-doc', type: 'text/markdown' },
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
- POST /api/contact/message - Submits a contact message.

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

export function getMcpServerCard() {
    return {
        serverInfo: {
            name: 'aiyu',
            version: '1.0.0',
        },
        transports: [
            {
                type: 'webmcp',
                endpoint: toAbsoluteSiteUrl('/'),
            },
        ],
        capabilities: {
            tools: {
                listChanged: false,
                tools: [
                    { name: 'aiyu.navigate' },
                    { name: 'aiyu.search' },
                    { name: 'aiyu.getPublicApiCatalog' },
                ],
            },
            resources: {
                subscribe: false,
                listChanged: false,
            },
            prompts: {
                listChanged: false,
            },
        },
        links: {
            apiCatalog: toAbsoluteSiteUrl('/.well-known/api-catalog'),
            documentation: toAbsoluteSiteUrl('/docs/api'),
        },
    };
}
