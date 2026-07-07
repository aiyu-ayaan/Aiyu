import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getPublicOrigin } from '@/lib/publicOrigin';

/** Minimal request stand-in matching the NextRequest surface the helper reads. */
function makeRequest({ headers = {}, origin = 'http://0.0.0.0:3000' } = {}) {
    const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    return {
        headers: { get: (name) => map.get(name.toLowerCase()) ?? null },
        nextUrl: { origin },
    };
}

describe('getPublicOrigin', () => {
    const originalSiteUrl = process.env.SITE_URL;
    const originalBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    beforeEach(() => {
        // A configured canonical origin is the safety net when the request's
        // host header is missing or an internal service name.
        process.env.SITE_URL = 'https://me.aiyu.co.in';
        delete process.env.NEXT_PUBLIC_BASE_URL;
    });

    afterEach(() => {
        if (originalSiteUrl === undefined) delete process.env.SITE_URL;
        else process.env.SITE_URL = originalSiteUrl;
        if (originalBaseUrl === undefined) delete process.env.NEXT_PUBLIC_BASE_URL;
        else process.env.NEXT_PUBLIC_BASE_URL = originalBaseUrl;
    });

    it('prefers x-forwarded-proto + x-forwarded-host (reverse proxy)', () => {
        const request = makeRequest({
            headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'aiyu.example.com' },
        });
        expect(getPublicOrigin(request)).toBe('https://aiyu.example.com');
    });

    it('falls back to the Host header when no forwarded host is present', () => {
        const request = makeRequest({ headers: { host: 'aiyu.example.com:8080' } });
        expect(getPublicOrigin(request)).toBe('http://aiyu.example.com:8080');
    });

    it('uses only the first value of comma-separated forwarded headers', () => {
        const request = makeRequest({
            headers: {
                'x-forwarded-proto': 'https, http',
                'x-forwarded-host': 'aiyu.example.com, internal.lb',
            },
        });
        expect(getPublicOrigin(request)).toBe('https://aiyu.example.com');
    });

    it('accepts localhost and IP literal hosts as public', () => {
        expect(getPublicOrigin(makeRequest({ headers: { host: 'localhost:3000' } }))).toBe('http://localhost:3000');
        expect(getPublicOrigin(makeRequest({ headers: { host: '127.0.0.1:3000' } }))).toBe('http://127.0.0.1:3000');
    });

    // ── issue #243: the internal Docker/nginx upstream name must never leak ──
    it('rejects a bare internal service host (nextjs) and uses the configured site URL', () => {
        // Behind the reverse proxy the Host header can arrive as the upstream
        // block name; echoing it would bounce the browser to http://nextjs/.
        const request = makeRequest({ headers: { host: 'nextjs' } });
        expect(getPublicOrigin(request)).toBe('https://me.aiyu.co.in');
    });

    it('rejects an internal x-forwarded-host too', () => {
        const request = makeRequest({
            headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'app' },
        });
        expect(getPublicOrigin(request)).toBe('https://me.aiyu.co.in');
    });

    it('falls back to the configured site URL when no host headers exist at all', () => {
        // The standalone (Docker) server binds on 0.0.0.0, so nextUrl reflects
        // that — never a usable public origin. Prefer the configured site URL.
        const request = makeRequest({ origin: 'http://0.0.0.0:3000' });
        expect(getPublicOrigin(request)).toBe('https://me.aiyu.co.in');
    });

    it('never returns the 0.0.0.0 bind address when a Host header is available', () => {
        const request = makeRequest({
            headers: { host: 'aiyu.example.com' },
            origin: 'http://0.0.0.0:3000',
        });
        expect(getPublicOrigin(request)).toBe('http://aiyu.example.com');
    });
});
