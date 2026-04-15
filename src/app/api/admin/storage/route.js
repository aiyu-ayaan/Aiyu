import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { auditStorageUsage } from '@/lib/storageAudit';

async function getStorageAudit() {
    try {
        const audit = await auditStorageUsage();
        return NextResponse.json({ success: true, data: audit });
    } catch (error) {
        console.error('[ERROR] Failed to audit storage usage:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to load storage usage.' },
            { status: 500 }
        );
    }
}

export const GET = withAuth(getStorageAudit);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
