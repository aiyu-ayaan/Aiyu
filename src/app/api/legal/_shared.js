import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { LegalError } from '@/lib/legal';

/**
 * Admin-only handler wrapper for /api/legal/*. Every route here exposes drafts,
 * so reads are session-gated too; public pages read through lib/legal directly.
 * LegalError maps to its HTTP status, anything else to 500.
 */
export async function handleAdmin(request, fn) {
    if (!(await getSession())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        let body = {};
        if (request.method !== 'GET' && request.method !== 'DELETE') {
            try {
                body = await request.json();
            } catch {
                body = {};
            }
        }
        return NextResponse.json(await fn(body), { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof LegalError) {
            return NextResponse.json({ error: error.message }, { status: error.status || 400 });
        }
        console.error('[legal] request failed:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
