import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getGDriveConfig } from '@/lib/gdrive';
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
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: callbackUrl,
      access_type: 'offline',
      prompt: 'consent',
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return NextResponse.redirect(authUrl);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Auth initialization failed' },
      { status: 500 }
    );
  }
}
