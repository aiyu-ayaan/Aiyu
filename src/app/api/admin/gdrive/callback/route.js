import { NextResponse } from 'next/server';
import { getGDriveConfig, saveGDriveConfig } from '@/lib/gdrive';
import { getPublicOrigin } from '@/lib/publicOrigin';

export async function GET(request) {
  const origin = getPublicOrigin(request);
  const { searchParams } = new URL(request.url);
  const error = searchParams.get('error');
  const code = searchParams.get('code');

  if (error || !code) {
    const errorParam = encodeURIComponent(error || 'missing_code');
    return NextResponse.redirect(new URL(`/admin/database?gdrive_error=${errorParam}`, origin));
  }

  try {
    const config = await getGDriveConfig();
    if (!config.clientId || !config.clientSecret) {
      return NextResponse.redirect(
        new URL('/admin/database?gdrive_error=not_configured', origin)
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
      return NextResponse.redirect(
        new URL('/admin/database?gdrive_error=token_exchange_failed', origin)
      );
    }

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(
        new URL('/admin/database?gdrive_error=no_access_token', origin)
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

    return NextResponse.redirect(new URL('/admin/database?gdrive=connected', origin));
  } catch (err) {
    console.error('GDrive callback error:', err);
    return NextResponse.redirect(
      new URL(`/admin/database?gdrive_error=${encodeURIComponent(err.message || 'unknown')}`, origin)
    );
  }
}
