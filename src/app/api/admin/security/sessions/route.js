/**
 * Active session manager.
 *
 *   GET /api/admin/security/sessions -> active + recently-revoked sessions,
 *   each with view-time GeoIP and a `current` flag marking the caller's device.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, SESSION_RETENTION_MS, SESSION_RETENTION_DAYS } from '@/lib/auth';
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
            // Inactive sessions are auto-deleted SESSION_RETENTION_MS after they
            // exited (revoked time, or expiry time for naturally-expired ones).
            const exitedAt = s.revokedAt
                ? new Date(s.revokedAt).getTime()
                : (expired ? new Date(s.expiresAt).getTime() : null);
            const deleteAt = exitedAt ? new Date(exitedAt + SESSION_RETENTION_MS).toISOString() : null;
            return {
                ...s,
                current: s._id === session.sessionId,
                active,
                expired,
                state: active ? 'active' : (s.revokedAt ? 'revoked' : 'expired'),
                deleteAt,
                geo: geo[s.ipAddress] || { label: s.ipAddress || 'Unknown' },
            };
        });

        const counts = {
            active: sessions.filter((s) => s.state === 'active').length,
            expired: sessions.filter((s) => s.state === 'expired').length,
            revoked: sessions.filter((s) => s.state === 'revoked').length,
        };

        return NextResponse.json({
            success: true,
            sessions,
            activeCount: counts.active,
            counts,
            retentionDays: SESSION_RETENTION_DAYS,
        });
    } catch (error) {
        console.error('[security/sessions] GET error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
