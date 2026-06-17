/**
 * Run uptime pings now and persist the results.
 *   POST /api/admin/health/uptime/check
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { runUptimeChecks, getUptimeSummary } from '@/lib/uptime';

export async function POST() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const results = await runUptimeChecks();
        const targets = await getUptimeSummary();
        return NextResponse.json({ success: true, checked: results.length, targets });
    } catch (error) {
        console.error('[health/uptime/check] error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
