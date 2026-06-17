import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton, upsertSingleton } from '@/lib/serialize';
import { getSession } from '@/lib/auth';
import cache from '@/lib/cache';
import { normalizeResumeData, createDefaultResumeData } from '@/lib/resume/schema';

export const runtime = 'nodejs';

/**
 * Admin CRUD for the Resume Tailoring Hub document (master schema + profiles).
 * Always returns a normalized, fully-id'd document so the editor never has to
 * defend against partial/legacy shapes.
 */
export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        let builder = await getSingleton(prisma, 'resumeBuilder');
        // Lazily materialize the seeded default so a fresh install opens with
        // real content instead of an empty editor.
        if (!builder || !builder.schema) {
            builder = await upsertSingleton(prisma, 'resumeBuilder', createDefaultResumeData());
        }
        return NextResponse.json(normalizeResumeData(builder));
    } catch (error) {
        console.error('Resume builder fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch resume builder' }, { status: 500 });
    }
}

export async function PUT(request) {
    return save(request);
}

export async function POST(request) {
    return save(request);
}

async function save(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        // Normalize before persisting so stored data is always valid, then
        // replace the three top-level keys wholesale (shallow merge semantics).
        const normalized = normalizeResumeData(body);
        const saved = await upsertSingleton(prisma, 'resumeBuilder', normalized);
        // Bust cached PDFs so the next download reflects the edit.
        await cache.invalidatePrefixAsync('db:resume');
        return NextResponse.json(normalizeResumeData(saved));
    } catch (error) {
        console.error('Resume builder save error:', error);
        return NextResponse.json({ error: 'Failed to save resume builder' }, { status: 500 });
    }
}
