import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getGDriveConfig } from '@/lib/gdrive';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getGDriveConfig();
    const configRecord = await prisma.config.findFirst();

    const isConfigured = Boolean(config.clientId && config.clientSecret);
    const isConnected = Boolean(config.refreshToken || config.accessToken);

    return NextResponse.json({
      isConfigured,
      isConnected,
      user: config.user || null,
      clientId: config.clientId || null,
      retentionMonths: config.retentionMonths || 1,
      updatedAt: configRecord?.updatedAt || null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get Google Drive status' },
      { status: 500 }
    );
  }
}
