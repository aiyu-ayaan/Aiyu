import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy.js';

vi.mock('@/lib/jwt', () => ({ decrypt: vi.fn(async () => null) }));

function makeRequest(path, { cookie, host = 'localhost:3000' } = {}) {
    const headers = { host };
    if (cookie) headers.cookie = cookie;
    return new NextRequest(`http://localhost:3000${path}`, { headers });
}

const rewritePath = (res) => new URL(res.headers.get('x-middleware-rewrite')).pathname;
const locationPath = (res) => new URL(res.headers.get('location')).pathname;

// URL model: the /v2 tree owns the clean URLs (served via rewrite). The removed
// classic site (/v1) and explicit /v2 prefixes redirect to the clean URL.
describe('proxy site routing', () => {
    it('rewrites clean URLs to the /v2 tree', async () => {
        expect(rewritePath(await proxy(makeRequest('/')))).toBe('/v2');
        expect(rewritePath(await proxy(makeRequest('/projects')))).toBe('/v2/projects');
        expect(rewritePath(await proxy(makeRequest('/blogs/some-post')))).toBe('/v2/blogs/some-post');
    });

    it('ignores a stale site-version cookie', async () => {
        const res = await proxy(makeRequest('/about-me', { cookie: 'site-version=classic' }));
        expect(res.headers.get('location')).toBeNull();
        expect(rewritePath(res)).toBe('/v2/about-me');
    });

    it('permanently redirects removed /v1 URLs to the clean URL', async () => {
        const res = await proxy(makeRequest('/v1/projects?x=1'));
        expect(res.status).toBe(301);
        const location = new URL(res.headers.get('location'));
        expect(location.pathname).toBe('/projects');
        expect(location.search).toBe('?x=1');

        const root = await proxy(makeRequest('/v1'));
        expect(root.status).toBe(301);
        expect(locationPath(root)).toBe('/');
    });

    it('redirects classic-only pages to their v2 home', async () => {
        expect(locationPath(await proxy(makeRequest('/live-deployments')))).toBe('/apps');
        expect(locationPath(await proxy(makeRequest('/v1/live-deployments')))).toBe('/apps');
        expect(locationPath(await proxy(makeRequest('/work-in-progress')))).toBe('/');
        expect(locationPath(await proxy(makeRequest('/gallery/abc')))).toBe('/gallery');
    });

    it('collapses an explicit /v2 visit to the clean URL', async () => {
        const res = await proxy(makeRequest('/v2/projects'));
        expect(res.status).toBe(308);
        expect(locationPath(res)).toBe('/projects');
    });

    it('never redirects to the internal upstream host (issue #243)', async () => {
        // Behind Docker/nginx the Host header can arrive as the internal
        // upstream name; the collapse redirect must not send the browser there.
        const res = await proxy(makeRequest('/v2/projects', { host: 'nextjs' }));
        expect(res.status).toBe(308);
        const location = new URL(res.headers.get('location'));
        expect(location.hostname).not.toBe('nextjs');
        expect(location.hostname).toContain('.');
        expect(location.pathname).toBe('/projects');
    });

    it('passes non-site paths through', async () => {
        const res = await proxy(makeRequest('/games'));
        expect(res.headers.get('x-middleware-rewrite')).toBeNull();
        expect(res.headers.get('location')).toBeNull();
    });
});
