import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
    isGithubAuthEnabled,
    isGithubAuthConfigured,
    getCallbackUrl,
    buildAuthorizeUrl,
    generateState,
} from '@/lib/githubOAuth';
import { getPublicOrigin } from '@/lib/publicOrigin';

// One-time CSRF token cookie. sameSite must be 'lax' (not 'strict') so the
// cookie survives the top-level redirect BACK from github.com to our callback;
// 'strict' would drop it and every login would fail the state check. Scoped to
// the OAuth path so it is not sent with unrelated requests.
const STATE_COOKIE = 'gh_oauth_state';
const STATE_TTL_SECONDS = 600; // 10 minutes

/**
 * Start the GitHub OAuth flow: set a CSRF `state` cookie and redirect to GitHub.
 */
export async function GET(request) {
    // Invisible when the feature is off — behaves as if the route does not exist.
    if (!isGithubAuthEnabled()) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fail closed to the login page if misconfigured (missing client/secret/id/base).
    if (!isGithubAuthConfigured() || !getCallbackUrl()) {
        // getPublicOrigin, not request.nextUrl: in the standalone (Docker)
        // server nextUrl carries the 0.0.0.0 bind address.
        return NextResponse.redirect(new URL('/admin/login?error=config', getPublicOrigin(request)));
    }

    const state = generateState();

    (await cookies()).set(STATE_COOKIE, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: STATE_TTL_SECONDS,
        path: '/api/auth/github',
    });

    return NextResponse.redirect(buildAuthorizeUrl({ state }));
}
