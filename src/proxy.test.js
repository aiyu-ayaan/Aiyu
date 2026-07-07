import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/jwt', () => ({ decrypt: vi.fn(async () => null) }));

// Each test re-imports the proxy so the module-scope site-version cache
// starts cold, and stubs the /api/config self-fetch with the admin default.
async function loadProxy(defaultSiteVersion) {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn(async () => ({
        ok: true,
        json: async () => ({ defaultSiteVersion }),
    })));
    const { proxy } = await import('./proxy.js');
    return proxy;
}

function makeRequest(path, { cookie } = {}) {
    const headers = { host: 'localhost:3000' };
    if (cookie) headers.cookie = cookie;
    return new NextRequest(`http://localhost:3000${path}`, { headers });
}

// URL model: the admin-default version owns the clean URLs (served there via
// rewrite, its prefix collapses); the non-default version is browsed VISIBLY
// under its /v1 or /v2 prefix. Visiting either prefix pins the choice in the
// site-version cookie.
describe('proxy version routing', () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
    });

    it('serves an explicit /v1 visit at the /v1 prefix when v2 is default', async () => {
        const proxy = await loadProxy('v2');
        const res = await proxy(makeRequest('/v1'));

        expect(res.headers.get('location')).toBeNull();
        expect(res.headers.get('x-middleware-next')).toBe('1');
    });

    it('collapses an explicit /v1 visit to the clean root when classic is the default', async () => {
        const proxy = await loadProxy('classic');
        const res = await proxy(makeRequest('/v1'));

        // /v1 IS the default version's prefix here, so it collapses back to the
        // clean URL (the default version owns the clean URLs) via a 308 redirect.
        expect(res.status).toBe(308);
        expect(new URL(res.headers.get('location')).pathname).toBe('/');
    });

    it('collapses an explicit /v2 visit to the clean URL when v2 is default', async () => {
        const proxy = await loadProxy('v2');
        const res = await proxy(makeRequest('/v2/projects'));

        // /v2 IS the default version's prefix here, so it collapses back to the
        // clean URL (the default version owns the clean URLs) via a 308 redirect.
        expect(res.status).toBe(308);
        expect(new URL(res.headers.get('location')).pathname).toBe('/projects');
    });

    it('does not redirect clean URLs based on cookies (serves default version v2 at clean URLs)', async () => {
        const proxy = await loadProxy('v2');
        const res = await proxy(makeRequest('/about-me', { cookie: 'site-version=classic' }));

        expect(res.headers.get('location')).toBeNull();
        const rewrite = res.headers.get('x-middleware-rewrite');
        expect(rewrite).toBeTruthy();
        expect(new URL(rewrite).pathname).toBe('/v2/about-me');
    });

    it('does not redirect clean root based on cookies (serves default version v2 at clean root)', async () => {
        const proxy = await loadProxy('v2');
        const res = await proxy(makeRequest('/', { cookie: 'site-version=classic' }));

        expect(res.headers.get('location')).toBeNull();
        const rewrite = res.headers.get('x-middleware-rewrite');
        expect(rewrite).toBeTruthy();
        expect(new URL(rewrite).pathname).toBe('/v2');
    });

    it('does not redirect clean URLs based on cookies (serves default version classic at clean URLs)', async () => {
        const proxy = await loadProxy('classic');
        const res = await proxy(makeRequest('/projects', { cookie: 'site-version=v2' }));

        expect(res.headers.get('location')).toBeNull();
        const rewrite = res.headers.get('x-middleware-rewrite');
        expect(rewrite).toBeTruthy();
        expect(new URL(rewrite).pathname).toBe('/v1/projects');
    });

    it('falls back to a v1 rewrite for pages that have no v2 counterpart', async () => {
        const proxy = await loadProxy('v2');
        const res = await proxy(makeRequest('/work-in-progress'));

        const rewrite = res.headers.get('x-middleware-rewrite');
        expect(rewrite).toBeTruthy();
        expect(new URL(rewrite).pathname).toBe('/v1/work-in-progress');
    });

    it('serves the admin default (v2) at clean URLs when no cookie is set', async () => {
        const proxy = await loadProxy('v2');
        const res = await proxy(makeRequest('/projects'));

        const rewrite = res.headers.get('x-middleware-rewrite');
        expect(rewrite).toBeTruthy();
        expect(new URL(rewrite).pathname).toBe('/v2/projects');
    });

    it('serves v1 at clean URLs when the admin default is classic', async () => {
        const proxy = await loadProxy('classic');
        const res = await proxy(makeRequest('/projects'));

        const rewrite = res.headers.get('x-middleware-rewrite');
        expect(rewrite).toBeTruthy();
        expect(new URL(rewrite).pathname).toBe('/v1/projects');
    });
});
