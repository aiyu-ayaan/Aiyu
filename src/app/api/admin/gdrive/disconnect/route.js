import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { clearGDriveTokens } from '@/lib/gdrive';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await clearGDriveTokens();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to disconnect Google Drive' },
      { status: 500 }
    );
  }
}
