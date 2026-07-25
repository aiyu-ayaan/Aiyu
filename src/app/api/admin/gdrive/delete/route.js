import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteDriveBackup } from '@/lib/gdrive';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { fileId } = body || {};

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'fileId is required' },
        { status: 400 }
      );
    }

    await deleteDriveBackup(fileId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Delete Google Drive backup failed' },
      { status: 500 }
    );
  }
}
