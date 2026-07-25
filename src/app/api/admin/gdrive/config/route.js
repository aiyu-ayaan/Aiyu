import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getGDriveConfig, saveGDriveConfig } from '@/lib/gdrive';
import { getPublicOrigin } from '@/lib/publicOrigin';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getGDriveConfig();
    const callbackUrl = `${getPublicOrigin(request)}/api/admin/gdrive/callback`;
    const isConfigured = Boolean(config.clientId && config.clientSecret);
    const isConnected = Boolean(config.refreshToken || config.accessToken);

    return NextResponse.json({
      clientId: config.clientId || '',
      hasClientSecret: Boolean(config.clientSecret),
      callbackUrl,
      isConfigured,
      isConnected,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, clientSecret } = body || {};

    const updates = {};
    if (clientId !== undefined) updates.clientId = clientId;
    if (clientSecret !== undefined) updates.clientSecret = clientSecret;

    const config = await saveGDriveConfig(updates);
    const isConfigured = Boolean(config.clientId && config.clientSecret);

    return NextResponse.json({
      success: true,
      isConfigured,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save configuration' },
      { status: 500 }
    );
  }
}
