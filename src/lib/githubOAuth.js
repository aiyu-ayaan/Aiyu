/**
 * GitHub OAuth helpers for the single-admin login.
 *
 * Authentication (GitHub proving who someone is) is deliberately kept separate
 * from authorization (this app admitting exactly one account). Anyone can
 * complete the OAuth dance; only the numeric id in GITHUB_ALLOWED_ID is ever
 * allowed to mint a session — see `isAllowedGithubId`, which is enforced in the
 * callback route BEFORE any session cookie is created.
 *
 * Pure, network-free helpers live here (and are unit-tested) so the route
 * handlers stay thin. `env` and `fetchImpl` are injectable for testing.
 */
import { randomUUID } from 'crypto';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

/** Master toggle. When false/unset, the GitHub flow is invisible and inert. */
export function isGithubAuthEnabled(env = process.env) {
    return env.GITHUB_AUTH_ENABLED === 'true';
}

/** Whether the minimum config to actually run the flow is present. */
export function isGithubAuthConfigured(env = process.env) {
    return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.GITHUB_ALLOWED_ID);
}

/**
 * The authorization decision. Fail-closed: an unset or non-positive-integer
 * GITHUB_ALLOWED_ID, or a missing/invalid candidate id, rejects. Using the
 * immutable numeric id (not the renamable username) makes this reclaim-proof.
 */
export function isAllowedGithubId(candidateId, env = process.env) {
    const allowed = Number(env.GITHUB_ALLOWED_ID);
    const candidate = Number(candidateId);
    if (!Number.isInteger(allowed) || allowed <= 0) return false;
    if (!Number.isInteger(candidate) || candidate <= 0) return false;
    return candidate === allowed;
}

/**
 * Server-fixed callback URL derived from configured base (never request input,
 * so it cannot be used for an open redirect / host spoof). Returns null if no
 * valid http(s) base is configured.
 */
export function getCallbackUrl(env = process.env) {
    const base = (env.SITE_URL || env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    if (!base) return null;
    try {
        const url = new URL('/api/auth/github/callback', base);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        return url.toString();
    } catch {
        return null;
    }
}

/** Authorize URL with no scopes requested (least privilege; /user still returns id + login). */
export function buildAuthorizeUrl({ state, env = process.env }) {
    const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID || '',
        redirect_uri: getCallbackUrl(env) || '',
        state,
        allow_signup: 'false',
    });
    return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
}

export function generateState() {
    return randomUUID();
}

/** Exchange the authorization code for an access token (server-to-server; secret stays server-side). */
export async function exchangeCodeForToken({ code, env = process.env, fetchImpl = fetch }) {
    try {
        const res = await fetchImpl(GITHUB_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                client_id: env.GITHUB_CLIENT_ID,
                client_secret: env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: getCallbackUrl(env),
            }),
        });
        if (!res.ok) return null;
        const data = await res.json().catch(() => null);
        if (!data || data.error || !data.access_token) return null;
        return data.access_token;
    } catch {
        return null;
    }
}

/** Fetch the authenticated GitHub user's identity. Returns `{ id, login }` or null. */
export async function fetchGithubUser({ accessToken, fetchImpl = fetch }) {
    try {
        const res = await fetchImpl(GITHUB_USER_URL, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
                'User-Agent': 'aiyu-portfolio-admin',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });
        if (!res.ok) return null;
        const data = await res.json().catch(() => null);
        if (!data || !data.id) return null;
        return { id: data.id, login: data.login };
    } catch {
        return null;
    }
}
