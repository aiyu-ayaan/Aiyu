/**
 * Active session manager.
 *
 *   GET /api/admin/security/sessions -> active + recently-revoked sessions,
 *   each with view-time GeoIP and a `current` flag marking the caller's device.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { toClientList } from '@/lib/serialize';
import { lookupGeoMany } from '@/lib/geoip';

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();
        const rows = await prisma.session.findMany({
            orderBy: [{ revokedAt: 'asc' }, { lastSeenAt: 'desc' }],
            take: 100,
        });

        const geo = await lookupGeoMany(rows.map((r) => r.ipAddress));

        const sessions = toClientList('session', rows).map((s) => {
            const expired = new Date(s.expiresAt).getTime() <= now.getTime();
            const active = !s.revokedAt && !expired;
            return {
                ...s,
                current: s._id === session.sessionId,
                active,
                expired,
                geo: geo[s.ipAddress] || { label: s.ipAddress || 'Unknown' },
            };
        });

        return NextResponse.json({
            success: true,
            sessions,
            activeCount: sessions.filter((s) => s.active).length,
        });
    } catch (error) {
        console.error('[security/sessions] GET error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
