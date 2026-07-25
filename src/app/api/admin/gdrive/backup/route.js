import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { uploadBackupToDrive } from '@/lib/gdrive';
import { getPublicOrigin } from '@/lib/publicOrigin';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const origin = getPublicOrigin(request);
    const { searchParams } = new URL(request.url);
    const exportUrl = `${origin}/api/admin/export?${searchParams.toString()}`;
    const cookieHeader = request.headers.get('cookie') || '';

    const exportRes = await fetch(exportUrl, {
      headers: {
        cookie: cookieHeader,
      },
    });

    if (!exportRes.ok) {
      const errText = await exportRes.text();
      return NextResponse.json(
        { success: false, error: `Export failed (${exportRes.status}): ${errText}` },
        { status: exportRes.status }
      );
    }

    const arrayBuffer = await exportRes.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuffer);

    let filename = `aiyu-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
    const contentDisposition = exportRes.headers.get('content-disposition');
    if (contentDisposition && contentDisposition.includes('filename=')) {
      const match = contentDisposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const result = await uploadBackupToDrive(zipBuffer, filename);

    return NextResponse.json({
      success: true,
      file: result,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Backup to Google Drive failed' },
      { status: 500 }
    );
  }
}
