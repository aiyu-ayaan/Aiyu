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

describe('proxy version routing', () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
    });

    it('redirects an explicit /v1 visit to the clean URL and pins classic', async () => {
        const proxy = await loadProxy('v2');
        const res = await proxy(makeRequest('/v1'));

        expect(res.status).toBe(307);
        expect(new URL(res.headers.get('location')).pathname).toBe('/');
        expect(res.headers.get('set-cookie')).toContain('site-version=classic');
    });

    it('redirects an explicit /v2 visit to the clean URL and pins v2, overriding a stale classic cookie', async () => {
        const proxy = await loadProxy('v2');
        const res = await proxy(makeRequest('/v2/projects', { cookie: 'site-version=classic' }));

        expect(res.status).toBe(307);
        expect(new URL(res.headers.get('location')).pathname).toBe('/projects');
        expect(res.headers.get('set-cookie')).toContain('site-version=v2');
    });

    it('serves v1 at clean URLs when the classic cookie is set', async () => {
        const proxy = await loadProxy('v2');
        const res = await proxy(makeRequest('/', { cookie: 'site-version=classic' }));

        const rewrite = res.headers.get('x-middleware-rewrite');
        expect(rewrite).toBeTruthy();
        expect(new URL(rewrite).pathname).toBe('/v1');
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
