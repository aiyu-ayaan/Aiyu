import { describe, it, expect } from 'vitest';
import {
    isGithubAuthEnabled,
    isGithubAuthConfigured,
    isAllowedGithubId,
    getCallbackUrl,
    buildAuthorizeUrl,
} from '@/lib/githubOAuth';

describe('isGithubAuthEnabled', () => {
    it('is true only for the exact string "true"', () => {
        expect(isGithubAuthEnabled({ GITHUB_AUTH_ENABLED: 'true' })).toBe(true);
    });

    it('is false for unset, empty, or other truthy-looking values', () => {
        expect(isGithubAuthEnabled({})).toBe(false);
        expect(isGithubAuthEnabled({ GITHUB_AUTH_ENABLED: '' })).toBe(false);
        expect(isGithubAuthEnabled({ GITHUB_AUTH_ENABLED: '1' })).toBe(false);
        expect(isGithubAuthEnabled({ GITHUB_AUTH_ENABLED: 'TRUE' })).toBe(false);
        expect(isGithubAuthEnabled({ GITHUB_AUTH_ENABLED: 'yes' })).toBe(false);
    });
});

describe('isGithubAuthConfigured', () => {
    const full = { GITHUB_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 'secret', GITHUB_ALLOWED_ID: '42' };

    it('requires client id, secret, and allowed id together', () => {
        expect(isGithubAuthConfigured(full)).toBe(true);
    });

    it('is false if any piece is missing', () => {
        expect(isGithubAuthConfigured({ ...full, GITHUB_CLIENT_ID: '' })).toBe(false);
        expect(isGithubAuthConfigured({ ...full, GITHUB_CLIENT_SECRET: '' })).toBe(false);
        expect(isGithubAuthConfigured({ ...full, GITHUB_ALLOWED_ID: '' })).toBe(false);
        expect(isGithubAuthConfigured({})).toBe(false);
    });
});

describe('isAllowedGithubId (the single-user lock)', () => {
    it('admits exactly the configured numeric id', () => {
        expect(isAllowedGithubId(12345678, { GITHUB_ALLOWED_ID: '12345678' })).toBe(true);
        // GitHub returns id as a number; a string of the same value also matches.
        expect(isAllowedGithubId('12345678', { GITHUB_ALLOWED_ID: '12345678' })).toBe(true);
    });

    it('rejects any other id', () => {
        expect(isAllowedGithubId(99887766, { GITHUB_ALLOWED_ID: '12345678' })).toBe(false);
    });

    it('fails closed when GITHUB_ALLOWED_ID is unset, empty, or non-numeric', () => {
        expect(isAllowedGithubId(12345678, {})).toBe(false);
        expect(isAllowedGithubId(12345678, { GITHUB_ALLOWED_ID: '' })).toBe(false);
        expect(isAllowedGithubId(12345678, { GITHUB_ALLOWED_ID: 'not-a-number' })).toBe(false);
        expect(isAllowedGithubId(12345678, { GITHUB_ALLOWED_ID: '0' })).toBe(false);
    });

    it('rejects missing, zero, or invalid candidate ids even when allow-list is set', () => {
        const env = { GITHUB_ALLOWED_ID: '12345678' };
        expect(isAllowedGithubId(undefined, env)).toBe(false);
        expect(isAllowedGithubId(null, env)).toBe(false);
        expect(isAllowedGithubId(0, env)).toBe(false);
        expect(isAllowedGithubId('', env)).toBe(false);
        expect(isAllowedGithubId(NaN, env)).toBe(false);
    });
});

describe('getCallbackUrl', () => {
    it('derives the callback from SITE_URL, trimming trailing slashes', () => {
        expect(getCallbackUrl({ SITE_URL: 'https://example.com/' }))
            .toBe('https://example.com/api/auth/github/callback');
    });

    it('falls back to NEXT_PUBLIC_BASE_URL', () => {
        expect(getCallbackUrl({ NEXT_PUBLIC_BASE_URL: 'http://localhost:3000' }))
            .toBe('http://localhost:3000/api/auth/github/callback');
    });

    it('returns null without a configured base or with a non-http(s) base', () => {
        expect(getCallbackUrl({})).toBeNull();
        expect(getCallbackUrl({ SITE_URL: 'ftp://example.com' })).toBeNull();
        expect(getCallbackUrl({ SITE_URL: 'not a url' })).toBeNull();
    });
});

describe('buildAuthorizeUrl', () => {
    const env = { GITHUB_CLIENT_ID: 'client123', SITE_URL: 'https://example.com' };

    it('targets GitHub authorize with client id, fixed callback, and state', () => {
        const url = new URL(buildAuthorizeUrl({ state: 'xyz', env }));
        expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
        expect(url.searchParams.get('client_id')).toBe('client123');
        expect(url.searchParams.get('redirect_uri')).toBe('https://example.com/api/auth/github/callback');
        expect(url.searchParams.get('state')).toBe('xyz');
    });

    it('requests no scopes (least privilege)', () => {
        const url = new URL(buildAuthorizeUrl({ state: 'xyz', env }));
        expect(url.searchParams.get('scope')).toBeNull();
    });
});
