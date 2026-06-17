/**
 * Uptime status + recent history per monitored endpoint.
 *   GET /api/admin/health/uptime
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUptimeSummary } from '@/lib/uptime';

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const targets = await getUptimeSummary();
        return NextResponse.json(
            { success: true, targets },
            { headers: { 'Cache-Control': 'no-store, max-age=0' } },
        );
    } catch (error) {
        console.error('[health/uptime] error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
