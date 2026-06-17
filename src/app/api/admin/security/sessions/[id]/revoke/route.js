/**
 * Revoke a single session (remote logout of one device).
 *
 *   POST /api/admin/security/sessions/:id/revoke
 *
 * Sets revokedAt on the row; the next request carrying that JWT fails the
 * getSession lookup and is rejected.
 */
import { NextResponse } from 'next/server';
import { getSession, revokeSession } from '@/lib/auth';
import { getClientIP } from '@/middleware/auth';
import { logAudit, AUDIT_CATEGORY } from '@/lib/audit';

export async function POST(request, { params }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const revoked = await revokeSession(id);

        if (!revoked) {
            return NextResponse.json(
                { success: false, error: 'Session not found or already revoked.' },
                { status: 404 },
            );
        }

        const self = id === session.sessionId;
        await logAudit({
            action: 'SESSION_REVOKED',
            category: AUDIT_CATEGORY.SECURITY,
            details: self ? 'Revoked own current session' : `Revoked session ${id}`,
            ipAddress: getClientIP(request),
            userAgent: request.headers.get('user-agent') || '',
        });

        return NextResponse.json({ success: true, revoked: id, self });
    } catch (error) {
        console.error('[security/sessions/revoke] error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
