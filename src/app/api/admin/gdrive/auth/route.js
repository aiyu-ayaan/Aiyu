import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSession } from '@/lib/auth';
import { getGDriveConfig, OAUTH_STATE_COOKIE, OAUTH_STATE_MAX_AGE } from '@/lib/gdrive';
import { getPublicOrigin } from '@/lib/publicOrigin';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getGDriveConfig();
    if (!config.clientId || !config.clientSecret) {
      return NextResponse.json(
        { success: false, error: 'Google Drive client ID or client secret is not configured' },
        { status: 400 }
      );
    }

    const callbackUrl = `${getPublicOrigin(request)}/api/admin/gdrive/callback`;

    // CSRF guard for the callback. The callback cannot check the admin session
    // itself (the `session` cookie is SameSite=Strict, so Google's cross-site
    // redirect never carries it), so this single-use nonce is what proves the
    // returning code belongs to a flow this admin started. Without it anyone who
    // knows the public client_id could consent with their own Google account and
    // have the site save their tokens — every later DB backup would upload there.
    const state = randomBytes(32).toString('hex');

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: callbackUrl,
      access_type: 'offline',
      prompt: 'consent',
      response_type: 'code',
      state,
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    const response = NextResponse.redirect(authUrl);
    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // Lax, not Strict: the cookie has to survive Google's cross-site redirect
      // back to the callback.
      sameSite: 'lax',
      path: '/api/admin/gdrive',
      maxAge: OAUTH_STATE_MAX_AGE,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Auth initialization failed' },
      { status: 500 }
    );
  }
}
