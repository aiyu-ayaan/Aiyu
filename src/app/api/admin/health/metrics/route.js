/**
 * Live server metrics snapshot (CPU/RAM/disk/event-loop/db).
 *   GET /api/admin/health/metrics
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sampleMetrics } from '@/lib/serverMetrics';

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const metrics = await sampleMetrics();
        return NextResponse.json(
            { success: true, metrics },
            { headers: { 'Cache-Control': 'no-store, max-age=0' } },
        );
    } catch (error) {
        console.error('[health/metrics] error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
