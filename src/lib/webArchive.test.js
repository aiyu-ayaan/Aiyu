import { describe, it, expect } from 'vitest';
import {
    getArchiveCredentials,
    buildAuthHeader,
    buildSavePayload,
    saveToWayback
} from './webArchive';

const env = { IA_ACCESS_KEY: 'access123', IA_SECRET_KEY: 'secret456' };

const jsonResponse = (body, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body)
});

describe('getArchiveCredentials', () => {
    it('returns both keys when configured', () => {
        expect(getArchiveCredentials(env)).toEqual({ accessKey: 'access123', secretKey: 'secret456' });
    });
    it('trims surrounding whitespace pasted in from the keys page', () => {
        expect(getArchiveCredentials({ IA_ACCESS_KEY: ' a ', IA_SECRET_KEY: '\tb\n' }))
            .toEqual({ accessKey: 'a', secretKey: 'b' });
    });
    it('points at both places a key can live', () => {
        expect(() => getArchiveCredentials({})).toThrow(/Global Environment Secrets/);
        expect(() => getArchiveCredentials({})).toThrow(/\.env/);
    });
    it('names the missing variable', () => {
        expect(() => getArchiveCredentials({ IA_ACCESS_KEY: 'a' })).toThrow(/IA_SECRET_KEY/);
        expect(() => getArchiveCredentials({})).toThrow(/IA_ACCESS_KEY and IA_SECRET_KEY/);
    });
});

describe('buildAuthHeader', () => {
    it('uses the LOW access:secret scheme', () => {
        expect(buildAuthHeader({ accessKey: 'a', secretKey: 'b' })).toBe('LOW a:b');
    });
});

describe('buildSavePayload', () => {
    it('form-encodes the url with capture_all on by default', () => {
        expect(buildSavePayload('https://me.aiyu.co.in/'))
            .toBe('url=https%3A%2F%2Fme.aiyu.co.in%2F&capture_all=1');
    });
    it('omits capture_all when disabled and adds screenshots on request', () => {
        expect(buildSavePayload('https://x.test/', { captureAll: false, captureScreenshot: true }))
            .toBe('url=https%3A%2F%2Fx.test%2F&capture_screenshot=1');
    });
});

describe('saveToWayback', () => {
    it('posts form-urlencoded credentials and returns the job id', async () => {
        let seen;
        const out = await saveToWayback('https://me.aiyu.co.in/', {
            env,
            fetchImpl: async (url, init) => {
                seen = { url, init };
                return jsonResponse({ url: 'https://me.aiyu.co.in/', job_id: 'spn2-abc' });
            }
        });

        expect(seen.url).toBe('https://web.archive.org/save');
        expect(seen.init.method).toBe('POST');
        expect(seen.init.headers.Authorization).toBe('LOW access123:secret456');
        expect(seen.init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
        expect(seen.init.body).toContain('capture_all=1');
        expect(out).toEqual({ url: 'https://me.aiyu.co.in/', jobId: 'spn2-abc', status: 200 });
    });

    it('surfaces the 401 message rather than a bare status', async () => {
        await expect(saveToWayback('https://x.test/', {
            env,
            fetchImpl: async () => jsonResponse({ message: 'You need to be logged in to use Save Page Now.' }, 401)
        })).rejects.toThrow(/HTTP 401: You need to be logged in/);
    });

    it('surfaces a rate limit distinctly', async () => {
        await expect(saveToWayback('https://x.test/', {
            env,
            fetchImpl: async () => jsonResponse({ message: 'Too Many Requests' }, 429)
        })).rejects.toThrow(/HTTP 429/);
    });

    it('fails on an HTML error shell instead of reporting success', async () => {
        await expect(saveToWayback('https://x.test/', {
            env,
            fetchImpl: async () => ({ ok: false, status: 500, text: async () => '<!DOCTYPE html><html>...' })
        })).rejects.toThrow(/HTTP 500/);
    });

    it('treats a 200 carrying only a message as a rejection', async () => {
        await expect(saveToWayback('https://x.test/', {
            env,
            fetchImpl: async () => jsonResponse({ message: 'Cannot capture this url' })
        })).rejects.toThrow(/rejected the request: Cannot capture this url/);
    });

    it('never calls the network without credentials', async () => {
        let called = false;
        await expect(saveToWayback('https://x.test/', {
            env: {},
            fetchImpl: async () => { called = true; return jsonResponse({}); }
        })).rejects.toThrow(/not configured/);
        expect(called).toBe(false);
    });
});
