import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { downloadDriveBackup } from '@/lib/gdrive';
import { getPublicOrigin } from '@/lib/publicOrigin';

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

    const zipBuffer = await downloadDriveBackup(fileId);

    const origin = getPublicOrigin(request);
    const importUrl = `${origin}/api/admin/import`;
    const cookieHeader = request.headers.get('cookie') || '';

    const importRes = await fetch(importUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/zip',
        cookie: cookieHeader,
      },
      body: zipBuffer,
    });

    const importResult = await importRes.json().catch(() => ({}));
    if (!importRes.ok) {
      return NextResponse.json(
        { success: false, error: importResult.error || 'Import failed' },
        { status: importRes.status }
      );
    }

    return NextResponse.json(importResult);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Restore from Google Drive failed' },
      { status: 500 }
    );
  }
}
