import { NextResponse } from 'next/server';
import { logout } from '@/lib/auth';
import { getClientIP } from '@/middleware/auth';
import { logAudit, AUDIT_CATEGORY } from '@/lib/audit';

export async function POST(request) {
    await logout();
    await logAudit({
        action: 'LOGOUT',
        category: AUDIT_CATEGORY.AUTH,
        details: 'Admin signed out',
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || '',
    });
    return NextResponse.json({ success: true }, { status: 200 });
}
