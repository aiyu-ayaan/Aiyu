import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import {
  getGDriveConfig,
  saveGDriveConfig,
  OAUTH_STATE_COOKIE,
} from '@/lib/gdrive';
import { getPublicOrigin } from '@/lib/publicOrigin';

// Clearing the nonce makes the handshake single-use: a replayed callback URL
// finds no cookie to match against.
function clearState(response) {
  response.cookies.set(OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/admin/gdrive',
    maxAge: 0,
  });
  return response;
}

function statesMatch(received, expected) {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request) {
  const origin = getPublicOrigin(request);
  const { searchParams } = new URL(request.url);
  const error = searchParams.get('error');
  const code = searchParams.get('code');

  if (error || !code) {
    const errorParam = encodeURIComponent(error || 'missing_code');
    return clearState(
      NextResponse.redirect(new URL(`/admin/database?gdrive_error=${errorParam}`, origin))
    );
  }

  // The admin session cookie is SameSite=Strict and so is absent on this
  // cross-site redirect; the nonce set when the flow started is what
  // authenticates it. Reject anything we did not initiate, before spending the
  // client secret on a token exchange.
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!statesMatch(searchParams.get('state'), expectedState)) {
    return clearState(
      NextResponse.redirect(new URL('/admin/database?gdrive_error=invalid_state', origin))
    );
  }

  try {
    const config = await getGDriveConfig();
    if (!config.clientId || !config.clientSecret) {
      return clearState(
        NextResponse.redirect(new URL('/admin/database?gdrive_error=not_configured', origin))
      );
    }

    const redirectUri = `${origin}/api/admin/gdrive/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('Google token exchange error:', errBody);
      return clearState(
        NextResponse.redirect(new URL('/admin/database?gdrive_error=token_exchange_failed', origin))
      );
    }

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return clearState(
        NextResponse.redirect(new URL('/admin/database?gdrive_error=no_access_token', origin))
      );
    }

    const tokenExpiry =
      Date.now() + (tokenData.expires_in ? tokenData.expires_in * 1000 : 3600 * 1000);

    let userEmail = null;
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        userEmail = userData.email || userData.name || null;
      }
    } catch (userErr) {
      console.warn('Failed to fetch Google user info:', userErr);
    }

    const updates = {
      accessToken: tokenData.access_token,
      tokenExpiry,
      user: userEmail,
    };

    if (tokenData.refresh_token) {
      updates.refreshToken = tokenData.refresh_token;
    }

    await saveGDriveConfig(updates);

    return clearState(NextResponse.redirect(new URL('/admin/database?gdrive=connected', origin)));
  } catch (err) {
    console.error('GDrive callback error:', err);
    return clearState(
      NextResponse.redirect(
        new URL(`/admin/database?gdrive_error=${encodeURIComponent(err.message || 'unknown')}`, origin)
      )
    );
  }
}
