import { NextResponse } from 'next/server';

const agentDiscoveryLinkHeader = [
    '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
    '</.well-known/openapi.json>; rel="service-desc"; type="application/openapi+json"',
    '</docs/api>; rel="service-doc"; type="text/markdown"',
    '</.well-known/oauth-protected-resource>; rel="describedby"; type="application/json"',
    '</.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"',
    '</.well-known/mcp/server-card.json>; rel="describedby"; type="application/json"',
].join(', ');

const markdownPages = {
    '/': {
        title: 'Aiyu Portfolio',
        description: 'Aiyu is a developer portfolio for projects, writing, live deployments, gallery entries, and contact workflows.',
        sections: [
            ['Agent Discovery', [
                'API catalog: /.well-known/api-catalog',
                'OpenAPI description: /.well-known/openapi.json',
                'API documentation: /docs/api',
                'Health status: /api/health',
                'OAuth protected resource metadata: /.well-known/oauth-protected-resource',
                'Agent skills index: /.well-known/agent-skills/index.json',
                'MCP server card: /.well-known/mcp/server-card.json',
            ]],
            ['Public Resources', [
                'Projects: /projects',
                'Blogs: /blogs',
                'Apps: /apps',
                'Gallery: /gallery',
                'GitHub stats: /github',
                'Live deployments: /live-deployments',
                'Contact: /contact-us',
            ]],
        ],
    },
    '/about-me': {
        title: 'About Aiyu',
        description: 'Profile, professional summary, experience, and technical skills.',
        sections: [['Related APIs', ['About API: /api/about', 'Homepage API: /api/home']]],
    },
    '/apps': {
        title: 'Aiyu Apps',
        description: 'Application and deployment highlights from the portfolio.',
        sections: [['Related APIs', ['Deployments API: /api/deployments']]],
    },
    '/blogs': {
        title: 'Aiyu Blogs',
        description: 'Published writing and technical notes.',
        sections: [['Related APIs', ['Blogs API: /api/blogs']]],
    },
    '/contact-us': {
        title: 'Contact Aiyu',
        description: 'Contact workflow for sending a message.',
        sections: [['Related APIs', ['Submit contact message: POST /api/contact/message']]],
    },
    '/gallery': {
        title: 'Aiyu Gallery',
        description: 'Gallery entries and visual work.',
        sections: [['Related APIs', ['Gallery API: /api/gallery']]],
    },
    '/github': {
        title: 'Aiyu GitHub',
        description: 'GitHub profile and repository statistics.',
        sections: [['Related APIs', ['GitHub stats API: /api/github/stats']]],
    },
    '/live-deployments': {
        title: 'Aiyu Live Deployments',
        description: 'Live deployment status and hosted project entries.',
        sections: [['Related APIs', ['Deployments API: /api/deployments']]],
    },
    '/projects': {
        title: 'Aiyu Projects',
        description: 'Portfolio projects, technology stacks, and project details.',
        sections: [['Related APIs', ['Projects API: /api/projects']]],
    },
    '/work-in-progress': {
        title: 'Aiyu Work In Progress',
        description: 'Current and upcoming portfolio work.',
        sections: [['Related Links', ['Projects: /projects', 'Apps: /apps']]],
    },
};

const publicMarkdownPrefixes = Object.keys(markdownPages)
    .filter((pathname) => pathname !== '/')
    .sort((a, b) => b.length - a.length);

function renderMarkdownPage(page, pathname) {
    const sections = page.sections
        .map(([heading, items]) => `## ${heading}\n\n${items.map((item) => `- ${item}`).join('\n')}`)
        .join('\n\n');

    return `# ${page.title}

${page.description}

Canonical path: ${pathname}

${sections}
`;
}

function getMarkdownPage(pathname) {
    if (markdownPages[pathname]) {
        return renderMarkdownPage(markdownPages[pathname], pathname);
    }

    const prefix = publicMarkdownPrefixes.find((candidate) => pathname.startsWith(`${candidate}/`));
    if (!prefix) return null;

    return renderMarkdownPage(markdownPages[prefix], pathname);
}

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

    const markdown = getMarkdownPage(pathname);

    if (markdown && acceptsMarkdown(request)) {
        return new Response(markdown, {
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
                'Cache-Control': 'no-store',
                'Link': agentDiscoveryLinkHeader,
                'Vary': 'Accept',
                'x-markdown-tokens': markdownTokenEstimate(markdown),
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
