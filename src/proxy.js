import { NextResponse } from 'next/server';
import { decrypt } from './lib/auth';

const rateLimitStore = globalThis.__apiRateLimitStore || new Map();
globalThis.__apiRateLimitStore = rateLimitStore;

const routeRateLimits = [
    { prefix: '/api/auth/login', methods: ['POST'], maxRequests: 5, windowMs: 5 * 60 * 1000 },
    { prefix: '/api/contact/message', methods: ['POST'], maxRequests: 15, windowMs: 5 * 60 * 1000 },
    { prefix: '/api/upload', methods: ['POST'], maxRequests: 60, windowMs: 60 * 1000 },
    { prefix: '/api/global-search', methods: ['GET'], maxRequests: 60, windowMs: 60 * 1000 },
];

const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const defaultRateLimit = { prefix: 'default', maxRequests: 120, windowMs: 60 * 1000 };

function getClientIP(request) {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    return request.headers.get('x-real-ip') || request.headers.get('x-client-ip') || 'unknown';
}

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

export async function proxy(request) {
    const path = request.nextUrl.pathname;
    const isPublicPath = path === '/admin/login';

    const rateLimitResponse = applyApiRateLimit(request);
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    const cookie = request.cookies.get('session')?.value;
    const session = await decrypt(cookie);

    if (path.startsWith('/admin') && !isPublicPath && !session) {
        return NextResponse.redirect(new URL('/admin/login', request.nextUrl));
    }

    if (isPublicPath && session) {
        return NextResponse.redirect(new URL('/admin', request.nextUrl));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/api/:path*'],
};
