import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listDriveBackups } from '@/lib/gdrive';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const files = await listDriveBackups();

    return NextResponse.json({
      success: true,
      files,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list Google Drive backups' },
      { status: 500 }
    );
  }
}
