import { describe, it, expect } from 'vitest';
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

    it('falls back to nextUrl.origin when no host headers exist at all', () => {
        const request = makeRequest({ origin: 'http://localhost:3000' });
        expect(getPublicOrigin(request)).toBe('http://localhost:3000');
    });

    it('never returns the 0.0.0.0 bind address when a Host header is available', () => {
        // The standalone (Docker) server binds on 0.0.0.0, so nextUrl reflects
        // that — the real client-facing host only exists in the headers.
        const request = makeRequest({
            headers: { host: 'aiyu.example.com' },
            origin: 'http://0.0.0.0:3000',
        });
        expect(getPublicOrigin(request)).toBe('http://aiyu.example.com');
    });
});
