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

    it('serves an explicit /v1 visit at the /v1 prefix and pins classic when v2 is default', async () => {
        const proxy = await loadProxy('v2');
        const res = await proxy(makeRequest('/v1'));

        expect(res.headers.get('location')).toBeNull();
        expect(res.headers.get('x-middleware-next')).toBe('1');
        expect(res.headers.get('set-cookie')).toContain('site-version=classic');
    });

    it('collapses /v1 to the clean URL when classic is the default', async () => {
        const proxy = await loadProxy('classic');
        const res = await proxy(makeRequest('/v1'));

        expect(res.status).toBe(307);
        expect(new URL(res.headers.get('location')).pathname).toBe('/');
        expect(res.headers.get('set-cookie')).toContain('site-version=classic');
    });

    it('collapses /v2 to the clean URL and re-pins v2 over a stale classic cookie when v2 is default', async () => {
        const proxy = await loadProxy('v2');
        const res = await proxy(makeRequest('/v2/projects', { cookie: 'site-version=classic' }));

        expect(res.status).toBe(307);
        expect(new URL(res.headers.get('location')).pathname).toBe('/projects');
        expect(res.headers.get('set-cookie')).toContain('site-version=v2');
    });

    it('redirects clean URLs to visible /v1 links for a classic-pinned visitor when v2 is default', async () => {
        const proxy = await loadProxy('v2');
        const res = await proxy(makeRequest('/about-me', { cookie: 'site-version=classic' }));

        expect(res.status).toBe(307);
        expect(new URL(res.headers.get('location')).pathname).toBe('/v1/about-me');
    });

    it('redirects the clean root to /v1 for a classic-pinned visitor when v2 is default', async () => {
        const proxy = await loadProxy('v2');
        const res = await proxy(makeRequest('/', { cookie: 'site-version=classic' }));

        expect(res.status).toBe(307);
        expect(new URL(res.headers.get('location')).pathname).toBe('/v1');
    });

    it('redirects clean URLs to visible /v2 links for a v2-pinned visitor when classic is default', async () => {
        const proxy = await loadProxy('classic');
        const res = await proxy(makeRequest('/projects', { cookie: 'site-version=v2' }));

        expect(res.status).toBe(307);
        expect(new URL(res.headers.get('location')).pathname).toBe('/v2/projects');
    });

    it('falls back to a v1 rewrite for v2-pinned visitors on pages that have no v2 counterpart', async () => {
        const proxy = await loadProxy('classic');
        const res = await proxy(makeRequest('/work-in-progress', { cookie: 'site-version=v2' }));

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
