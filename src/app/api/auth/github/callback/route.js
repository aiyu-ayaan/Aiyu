import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
    isGithubAuthEnabled,
    isGithubAuthConfigured,
    isAllowedGithubId,
    exchangeCodeForToken,
    fetchGithubUser,
} from '@/lib/githubOAuth';
import { createSession } from '@/lib/auth';
import { getClientIP } from '@/middleware/auth';
import { logAudit, AUDIT_CATEGORY } from '@/lib/audit';

const STATE_COOKIE = 'gh_oauth_state';

async function clearStateCookie() {
    // Mutating via the headers store is merged into the returned NextResponse,
    // the same proven pattern the password login route uses to set the session
    // cookie while returning a NextResponse.
    (await cookies()).set(STATE_COOKIE, '', {
        httpOnly: true,
        path: '/api/auth/github',
        maxAge: 0,
    });
}

async function loginRedirect(request, error) {
    await clearStateCookie();
    const url = new URL('/admin/login', request.nextUrl);
    if (error) url.searchParams.set('error', error);
    return NextResponse.redirect(url);
}

/**
 * GitHub OAuth callback. Fail-closed gauntlet — any failed check redirects back
 * to the login page WITHOUT minting a session, and never reveals which check
 * failed. The single-user lock (`isAllowedGithubId`) runs before createSession,
 * so an authenticated-but-unauthorized GitHub user never receives a cookie.
 */
export async function GET(request) {
    if (!isGithubAuthEnabled()) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const params = new URL(request.url).searchParams;

    // GitHub reported an error (e.g. the user denied access).
    if (params.get('error')) {
        return loginRedirect(request, 'denied');
    }

    if (!isGithubAuthConfigured()) {
        return loginRedirect(request, 'config');
    }

    // CSRF: returned state must match the cookie set when the flow started.
    const returnedState = params.get('state') || '';
    const cookieState = request.cookies.get(STATE_COOKIE)?.value || '';
    if (!returnedState || !cookieState || returnedState !== cookieState) {
        await logAudit({
            action: 'LOGIN_FAILED',
            category: AUDIT_CATEGORY.SECURITY,
            details: 'GitHub OAuth state mismatch (possible CSRF)',
            ipAddress: clientIP,
            userAgent,
        });
        return loginRedirect(request, 'state');
    }

    const code = params.get('code');
    if (!code) {
        return loginRedirect(request, 'invalid');
    }

    const accessToken = await exchangeCodeForToken({ code });
    if (!accessToken) {
        return loginRedirect(request, 'exchange');
    }

    const githubUser = await fetchGithubUser({ accessToken });
    if (!githubUser) {
        return loginRedirect(request, 'profile');
    }

    // THE LOCK: only the one allowed numeric id gets past here.
    if (!isAllowedGithubId(githubUser.id)) {
        console.warn(`[SECURITY] GitHub login denied for id ${githubUser.id} (@${githubUser.login})`);
        await logAudit({
            action: 'LOGIN_FAILED',
            category: AUDIT_CATEGORY.SECURITY,
            details: `GitHub id ${githubUser.id} (@${githubUser.login || 'unknown'}) not authorized`,
            ipAddress: clientIP,
            userAgent,
        });
        return loginRedirect(request, 'forbidden');
    }

    await createSession({
        user: { email: '', name: 'Admin', login: githubUser.login },
        meta: { ipAddress: clientIP, userAgent },
    });

    console.log(`[AUTH] GitHub login success for @${githubUser.login} (id ${githubUser.id}) from IP ${clientIP}`);
    await logAudit({
        action: 'LOGIN_SUCCESS',
        category: AUDIT_CATEGORY.AUTH,
        details: `Admin signed in via GitHub (@${githubUser.login})`,
        ipAddress: clientIP,
        userAgent,
    });

    await clearStateCookie();
    // Fixed internal target — never a user-supplied redirect (no open redirect).
    return NextResponse.redirect(new URL('/admin', request.nextUrl));
}
