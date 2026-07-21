/**
 * Per-page social / Open Graph metadata admin API.
 *
 *   GET /api/admin/social -> merged { defaultImage, pages }
 *   PUT /api/admin/social -> normalize + persist the social block
 *
 * The global default image itself lives on the Config singleton as `ogImage`
 * (shared with the site's global OG tag) and is managed via /api/config — this
 * route only owns the per-page overrides + an optional social-specific default.
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSocialMeta, saveSocialMeta } from '@/lib/socialMeta';

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const social = await getSocialMeta();
        return NextResponse.json({ success: true, social });
    } catch (error) {
        console.error('[admin/social] GET error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        const social = await saveSocialMeta(body?.social ?? body);
        return NextResponse.json({ success: true, social });
    } catch (error) {
        console.error('[admin/social] PUT error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
