import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import { requireAiWrite, seedDefaultsIfEmpty } from '@/lib/aiSections';

/**
 * One-time idempotent backfill of the four content tables from the stored
 * skeleton (if it still carries content) or the bundled defaults. Safe to
 * re-run — each table is skipped if it already has rows. Dual-auth write.
 */
export async function POST(request) {
    if (!(await requireAiWrite(request))) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const stored = await getSingleton(prisma, 'aiPage');
        const seeded = await seedDefaultsIfEmpty(stored);
        return NextResponse.json({ ok: true, seeded });
    } catch (error) {
        console.error('AI section seed failed:', error);
        return NextResponse.json({ ok: false, error: 'Failed to seed AI sections' }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
