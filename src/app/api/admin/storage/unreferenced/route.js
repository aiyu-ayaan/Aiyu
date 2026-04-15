import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { deleteUnreferencedUploads } from '@/lib/storageAudit';

async function deleteUnreferenced(request) {
    try {
        const body = await request.json();
        const filenames = Array.isArray(body?.filenames) ? body.filenames : [];

        if (filenames.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No filenames were provided.' },
                { status: 400 }
            );
        }

        const result = await deleteUnreferencedUploads(filenames);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('[ERROR] Failed to delete unreferenced uploads:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete unreferenced uploads.' },
            { status: 500 }
        );
    }
}

export const DELETE = withAuth(deleteUnreferenced);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
