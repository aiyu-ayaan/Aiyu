import { NextResponse } from 'next/server';

const agentDiscoveryLinkHeader = [
    '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
    '</.well-known/openapi.json>; rel="service-desc"; type="application/openapi+json"',
    '</docs/api>; rel="service-doc"; type="text/markdown"',
    '</.well-known/oauth-protected-resource>; rel="describedby"; type="application/json"',
    '</.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"',
    '</.well-known/mcp/server-card.json>; rel="describedby"; type="application/json"',
].join(', ');

const homeMarkdown = `# Aiyu Portfolio

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
`;

function acceptsMarkdown(request) {
    const accept = request.headers.get('accept') || '';
    return accept
        .split(',')
        .map((entry) => entry.split(';')[0].trim().toLowerCase())
        .includes('text/markdown');
}

function markdownTokenEstimate(markdown) {
    return String(markdown.trim().split(/\s+/).filter(Boolean).length);
}

export function middleware(request) {
    const pathname = request.nextUrl.pathname;

    if (pathname === '/' && acceptsMarkdown(request)) {
        return new Response(homeMarkdown, {
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
                'Cache-Control': 'no-store',
                'Link': agentDiscoveryLinkHeader,
                'Vary': 'Accept',
                'x-markdown-tokens': markdownTokenEstimate(homeMarkdown),
            },
        });
    }

    const response = NextResponse.next();

    if (pathname === '/') {
        response.headers.set('Link', agentDiscoveryLinkHeader);
        response.headers.append('Vary', 'Accept');
    }

    return response;
}

// Keep middleware off static assets and low-value file requests so spikes reach
// the origin with less per-request overhead.
export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|images|uploads|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|txt|xml)$).*)',
    ],
};
