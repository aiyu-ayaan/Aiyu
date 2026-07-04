import { NextResponse } from 'next/server';
import { decrypt } from './lib/jwt';
import { getClientIP } from './lib/clientIp';
import { getPublicOrigin } from './lib/publicOrigin';

// ────────────────────────────────────────────────────────────────────────────
// Edge proxy. Runs on every non-static request (see `config.matcher`) and is
// responsible for, in order:
//   1. API rate limiting (/api/*)
//   2. Canonical host redirect (public GET/HEAD)
//   3. Admin auth gate (/admin/*)
//   4. Agent-discovery markdown negotiation for known public pages
//
// IMPORTANT: this file is the project's single live edge handler. In a `src/`
// based Next 16 project the convention file must be `src/proxy.(js|ts)`; a
// root-level `middleware.ts` is ignored, which is why the markdown/canonical
// logic below was migrated here from the (now removed) root middleware.
// ────────────────────────────────────────────────────────────────────────────

const rateLimitStore = globalThis.__apiRateLimitStore || new Map();
globalThis.__apiRateLimitStore = rateLimitStore;

const routeRateLimits = [
    { prefix: '/api/auth/login', methods: ['POST'], maxRequests: 5, windowMs: 5 * 60 * 1000 },
    { prefix: '/api/auth/github', methods: ['GET'], maxRequests: 10, windowMs: 5 * 60 * 1000 },
    { prefix: '/api/contact/message', methods: ['POST'], maxRequests: 15, windowMs: 5 * 60 * 1000 },
    { prefix: '/api/upload', methods: ['POST'], maxRequests: 60, windowMs: 60 * 1000 },
    { prefix: '/api/global-search', methods: ['GET'], maxRequests: 60, windowMs: 60 * 1000 },
];

const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const defaultRateLimit = { prefix: 'default', maxRequests: 120, windowMs: 60 * 1000 };

function getRateLimitConfig(pathname, method) {
    const normalizedMethod = String(method || 'GET').toUpperCase();

    const explicitRule = routeRateLimits.find((rule) => {
        const matchesPath = pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`);
        const matchesMethod = !rule.methods || rule.methods.includes(normalizedMethod);
        return matchesPath && matchesMethod;
    });

    if (explicitRule) {
        return explicitRule;
    }

    if (mutatingMethods.has(normalizedMethod)) {
        return defaultRateLimit;
    }

    return null;
}

function cleanupExpiredRateLimitEntries(now) {
    if (rateLimitStore.size < 5000) return;

    for (const [key, value] of rateLimitStore.entries()) {
        if (now >= value.resetAt) {
            rateLimitStore.delete(key);
        }
    }
}

function evaluateRateLimit(identifier, maxRequests, windowMs) {
    const now = Date.now();
    cleanupExpiredRateLimitEntries(now);

    const existing = rateLimitStore.get(identifier);

    if (!existing || now >= existing.resetAt) {
        const fresh = { count: 1, resetAt: now + windowMs };
        rateLimitStore.set(identifier, fresh);
        return {
            allowed: true,
            limit: maxRequests,
            remaining: maxRequests - 1,
            resetAt: fresh.resetAt,
            retryAfterSeconds: 0,
        };
    }

    if (existing.count >= maxRequests) {
        return {
            allowed: false,
            limit: maxRequests,
            remaining: 0,
            resetAt: existing.resetAt,
            retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        };
    }

    existing.count += 1;
    rateLimitStore.set(identifier, existing);

    return {
        allowed: true,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - existing.count),
        resetAt: existing.resetAt,
        retryAfterSeconds: 0,
    };
}

function applyApiRateLimit(request) {
    const path = request.nextUrl.pathname;
    if (!path.startsWith('/api') || path === '/api/health' || request.method === 'OPTIONS') {
        return null;
    }

    const clientIP = getClientIP(request);
    const rule = getRateLimitConfig(path, request.method);
    if (!rule) {
        return null;
    }

    const bucket = `${rule.prefix}:${clientIP}`;
    const result = evaluateRateLimit(bucket, rule.maxRequests, rule.windowMs);

    if (result.allowed) {
        return null;
    }

    return NextResponse.json(
        {
            success: false,
            error: 'Too many requests. Please try again later.',
        },
        {
            status: 429,
            headers: {
                'Retry-After': String(result.retryAfterSeconds),
                'X-RateLimit-Limit': String(result.limit),
                'X-RateLimit-Remaining': String(result.remaining),
                'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
            },
        }
    );
}

// ──────────────────────────────────────────────────────────────────────────
// Canonical host redirect
// ──────────────────────────────────────────────────────────────────────────
const CANONICAL_HOST_REDIRECT_DISABLED = process.env.CANONICAL_HOST_REDIRECT === 'false';
const canonicalSiteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || '';

function getCanonicalUrl() {
    if (!canonicalSiteUrl) return null;

    try {
        const parsedUrl = new URL(canonicalSiteUrl);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return null;
        }
        return parsedUrl;
    } catch {
        return null;
    }
}

function isLocalhost(hostname) {
    return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        hostname.endsWith('.local') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    );
}

// The request's public host. In the standalone (Docker) server `request.nextUrl`
// reflects the server bind address (HOSTNAME=0.0.0.0), NOT the host the client
// asked for — so the canonical comparison must read the forwarded/Host header
// instead. Using nextUrl.hostname here made every request look like "0.0.0.0",
// which is neither localhost nor the canonical host, so the redirect fired on
// every GET/HEAD and bounced the dockerized site to SITE_URL.
function getRequestHostname(request) {
    const forwarded = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    return forwarded.split(',')[0].trim().split(':')[0].toLowerCase();
}

function getCanonicalHostRedirect(request) {
    if (CANONICAL_HOST_REDIRECT_DISABLED) return null;
    if (request.method !== 'GET' && request.method !== 'HEAD') return null;

    const canonicalUrl = getCanonicalUrl();
    if (!canonicalUrl) return null;

    const requestHostname = getRequestHostname(request);
    if (!requestHostname || isLocalhost(requestHostname) || requestHostname === canonicalUrl.hostname) {
        return null;
    }

    const currentUrl = request.nextUrl;
    const redirectUrl = new URL(currentUrl.pathname + currentUrl.search, canonicalUrl.origin);
    return NextResponse.redirect(redirectUrl, 308);
}

// ──────────────────────────────────────────────────────────────────────────
// Agent-discovery markdown negotiation
// ──────────────────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────────────────
// Default site version (set at /admin/version). The default version is
// served AT the clean URLs via rewrite — the address bar, sitemap, and
// canonical structure never change — and its own prefix collapses back to
// the clean URLs. The NON-default version is browsed visibly under its /v1
// or /v2 prefix; the site-version cookie (pinned whenever a prefix is
// visited, or by the v2 header's [classic] link) redirects a pinned
// visitor's clean-URL hits to that prefix. The flag is read from the public
// config API and cached in module scope so it costs one self-fetch per TTL,
// not per request.
// ──────────────────────────────────────────────────────────────────────────
const V2_PAGES = new Set([
    '/',
    '/about-me',
    '/projects',
    '/gallery',
    '/apps',
    '/blogs',
    '/github',
    '/contact-us'
]);

const SITE_VERSION_CACHE_TTL_MS = process.env.NODE_ENV === 'production' ? 30 * 1000 : 1000;
let siteVersionCache = { value: 'classic', expiresAt: 0 };

function isV2Page(pathname) {
    return V2_PAGES.has(pathname) || pathname.startsWith('/blogs/');
}

function getRewriteTarget(pathname, activeVersion) {
    if (activeVersion === 'v2' && isV2Page(pathname)) {
        return `/v2${pathname === '/' ? '' : pathname}`;
    }
    // Fall back to v1 for classic/v1, or anything not in V2
    return `/v1${pathname === '/' ? '' : pathname}`;
}

async function getDefaultSiteVersion(request) {
    const now = Date.now();
    if (now < siteVersionCache.expiresAt) {
        return siteVersionCache.value;
    }

    try {
        const basePath = request.nextUrl.basePath || '';
        const configUrl = new URL(basePath + '/api/config', request.nextUrl.origin);
        // Standalone/Docker binds on 0.0.0.0, which is not a fetchable host.
        if (configUrl.hostname === '0.0.0.0') configUrl.hostname = '127.0.0.1';

        const response = await fetch(configUrl, { headers: { accept: 'application/json' } });
        const config = response.ok ? await response.json() : null;
        siteVersionCache = {
            value: config?.defaultSiteVersion === 'v2' ? 'v2' : 'classic',
            expiresAt: now + SITE_VERSION_CACHE_TTL_MS,
        };
    } catch {
        // Keep serving the last known value; retry sooner than a full TTL.
        siteVersionCache = { value: siteVersionCache.value, expiresAt: now + 5000 };
    }

    return siteVersionCache.value;
}

function getCookieVersion(request) {
    const cookieVal = request.cookies.get('site-version')?.value;
    if (cookieVal === 'classic' || cookieVal === 'v1') {
        return 'v1';
    }
    if (cookieVal === 'v2') {
        return 'v2';
    }
    return null;
}

function pinVersionCookie(response, version) {
    response.cookies.set('site-version', version === 'v1' ? 'classic' : 'v2', {
        path: '/',
        maxAge: 31536000,
    });
    return response;
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

const PUBLIC_PAGE_PREFIXES = [
    '/projects/',
    '/gallery/',
    '/apps/',
    '/blogs/'
];

const PUBLIC_PAGE_EXACTS = new Set([
    '/',
    '/about-me',
    '/projects',
    '/gallery',
    '/apps',
    '/blogs',
    '/contact-us',
    '/github',
    '/sitemap',
    '/work-in-progress',
    '/live-deployments'
]);

function isPublicPage(pathname) {
    if (!pathname || pathname.includes('.')) {
        return false;
    }
    if (PUBLIC_PAGE_EXACTS.has(pathname)) {
        return true;
    }
    return PUBLIC_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request) {
    // If this is an internal rewrite, bypass middleware execution to prevent infinite loops.
    if (request.headers.get('x-is-rewrite') === 'true') {
        return NextResponse.next();
    }

    const path = request.nextUrl.pathname;

    // 1. API paths: rate limiting only (no markdown / canonical redirect).
    if (path.startsWith('/api')) {
        const rateLimitResponse = applyApiRateLimit(request);
        return rateLimitResponse || NextResponse.next();
    }

    // 2. Canonical host redirect for public GET/HEAD requests.
    const canonicalRedirect = getCanonicalHostRedirect(request);
    if (canonicalRedirect) {
        return canonicalRedirect;
    }

    // 3. Admin auth gate (only touch the session cookie under /admin).
    if (path.startsWith('/admin')) {
        const isPublicPath = path === '/admin/login';
        const session = await decrypt(request.cookies.get('session')?.value);

        // getPublicOrigin, not request.nextUrl: in the standalone (Docker)
        // server nextUrl carries the 0.0.0.0 bind address.
        if (!isPublicPath && !session) {
            return NextResponse.redirect(new URL('/admin/login', getPublicOrigin(request)));
        }
        if (isPublicPath && session) {
            return NextResponse.redirect(new URL('/admin', getPublicOrigin(request)));
        }

        return NextResponse.next();
    }

    // 4. Agent-discovery markdown negotiation for known public pages.
    const markdown = getMarkdownPage(path);
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

    // 5. Dynamic site versioning (V1 vs V2):
    //    We can access specific version with /v1 or /v2 prefix, served directly.
    //    The default version is served at clean URLs (no version prefix) via rewrite.
    if (request.method === 'GET' || request.method === 'HEAD') {
        const isV1Path = path === '/v1' || path.startsWith('/v1/');
        const isV2Path = path === '/v2' || path.startsWith('/v2/');

        let innerPath = path;
        if (isV1Path) innerPath = path.slice('/v1'.length) || '/';
        if (isV2Path) innerPath = path.slice('/v2'.length) || '/';

        if (isPublicPage(innerPath)) {
            // If explicit /v1 or /v2 path:
            if (isV1Path || isV2Path) {
                const defaultVersion = (await getDefaultSiteVersion(request)) === 'v2' ? 'v2' : 'v1';
                const pathVersion = isV1Path ? 'v1' : 'v2';

                // If they are accessing the default version's path prefix, redirect to clean URL
                if (pathVersion === defaultVersion) {
                    const search = request.nextUrl.search || '';
                    const redirectUrl = new URL((request.nextUrl.basePath || '') + innerPath + search, getPublicOrigin(request));
                    return NextResponse.redirect(redirectUrl, 308);
                }

                // Otherwise, serve it directly (non-default version)
                const requestHeaders = new Headers(request.headers);
                requestHeaders.set('x-original-path', path);
                return NextResponse.next({
                    request: {
                        headers: requestHeaders,
                    }
                });
            }

            // Clean URL: rewrite to serve the default version
            const defaultVersion = (await getDefaultSiteVersion(request)) === 'v2' ? 'v2' : 'v1';
            const rewriteTarget = getRewriteTarget(path, defaultVersion);
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set('x-is-rewrite', 'true');
            requestHeaders.set('x-original-path', path);

            const rewriteResponse = NextResponse.rewrite(
                new URL((request.nextUrl.basePath || '') + rewriteTarget + request.nextUrl.search, request.nextUrl.origin),
                {
                    request: {
                        headers: requestHeaders,
                    }
                }
            );
            if (path === '/') {
                rewriteResponse.headers.set('Link', agentDiscoveryLinkHeader);
                rewriteResponse.headers.append('Vary', 'Accept');
            }
            return rewriteResponse;
        }
    }

    const response = NextResponse.next();

    if (path === '/') {
        response.headers.set('Link', agentDiscoveryLinkHeader);
        response.headers.append('Vary', 'Accept');
    }

    return response;
}

// Keep the proxy off static assets and low-value file requests so spikes reach
// the origin with less per-request overhead. Note: unlike the old root
// middleware matcher, `/api` is intentionally INCLUDED here so API rate
// limiting runs.
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|images|uploads|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|txt|xml)$).*)',
    ],
};
