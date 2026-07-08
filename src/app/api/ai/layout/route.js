import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton, upsertSingleton } from '@/lib/serialize';
import { DEFAULT_AI_PAGE } from '@/lib/aiPageDefaults';
import { requireAiWrite, invalidateAiPage } from '@/lib/aiSections';

/**
 * The AI Hub page *skeleton*: the ordered list of sections with their shells
 * (id, type, enabled, eyebrow, title, subtitle, accent) plus the hero/stats
 * payloads. Item content for skills/recommendations/credits/prompts is managed
 * through their own endpoints; this route owns order, visibility, and headings.
 *
 * Replaces the removed PUT /api/ai-page. Reads are public; writes are dual-auth
 * (admin session or bearer token).
 */
export async function GET() {
    try {
        const stored = await getSingleton(prisma, 'aiPage');
        const skeleton = !stored || !Array.isArray(stored.sections) || stored.sections.length === 0
            ? { ...DEFAULT_AI_PAGE }
            : stored;
        return NextResponse.json(skeleton);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch AI page layout' }, { status: 500 });
    }
}

export async function PUT(request) {
    if (!(await requireAiWrite(request))) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        // Guard against malformed payloads so a bad save can't wipe the page.
        if (!body || !Array.isArray(body.sections)) {
            return NextResponse.json({ ok: false, error: 'Invalid payload: `sections` array required' }, { status: 400 });
        }
        const saved = await upsertSingleton(prisma, 'aiPage', { sections: body.sections });
        await invalidateAiPage();
        return NextResponse.json({ ok: true, ...saved });
    } catch (error) {
        return NextResponse.json({ ok: false, error: 'Failed to update AI page layout' }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
