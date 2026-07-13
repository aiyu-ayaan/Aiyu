import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton, upsertSingleton } from '@/lib/serialize';
import { withAuth } from '@/middleware/auth';
import { defaultStudio, MAX_SNAPSHOTS } from '@/lib/resumeStudio';

const MAX_LATEX_BYTES = 512 * 1024; // hard cap on a single document
const MAX_IDEAS = 200;

async function getStudio() {
    try {
        const stored = await getSingleton(prisma, 'resumeStudio');
        const studio = { ...defaultStudio(), ...(stored || {}) };
        return NextResponse.json({ success: true, data: studio });
    } catch (error) {
        console.error('[Resume Studio] GET failed:', error);
        return NextResponse.json({ success: false, error: 'Failed to load resume studio' }, { status: 500 });
    }
}

async function saveStudio(request) {
    try {
        const body = await request.json();
        const patch = {};

        if (typeof body.latex === 'string') {
            if (Buffer.byteLength(body.latex, 'utf8') > MAX_LATEX_BYTES) {
                return NextResponse.json({ success: false, error: 'Document too large (512KB max)' }, { status: 413 });
            }
            patch.latex = body.latex;
        }
        if (typeof body.engine === 'string') patch.engine = body.engine;
        if (typeof body.templateId === 'string') patch.templateId = body.templateId;

        if (Array.isArray(body.snapshots)) {
            patch.snapshots = body.snapshots.slice(0, MAX_SNAPSHOTS).map((snap) => ({
                id: String(snap.id || Date.now()),
                label: String(snap.label || 'Version').slice(0, 120),
                latex: String(snap.latex || ''),
                createdAt: snap.createdAt || new Date().toISOString(),
                updatedAt: snap.updatedAt || snap.createdAt || new Date().toISOString(),
            }));
        }

        if (body.activeVersionId !== undefined) {
            patch.activeVersionId = body.activeVersionId ? String(body.activeVersionId) : null;
        }

        if (Array.isArray(body.ideas)) {
            patch.ideas = body.ideas.slice(0, MAX_IDEAS).map((idea) => ({
                id: String(idea.id || Date.now()),
                text: String(idea.text || '').slice(0, 2000),
                done: Boolean(idea.done),
                createdAt: idea.createdAt || new Date().toISOString(),
            }));
        }

        if (body.lastCompiledAt !== undefined) patch.lastCompiledAt = body.lastCompiledAt;
        if (body.lastPublishedAt !== undefined) patch.lastPublishedAt = body.lastPublishedAt;

        const saved = await upsertSingleton(prisma, 'resumeStudio', patch);
        return NextResponse.json({ success: true, data: { ...defaultStudio(), ...saved } });
    } catch (error) {
        console.error('[Resume Studio] PUT failed:', error);
        return NextResponse.json({ success: false, error: 'Failed to save resume studio' }, { status: 500 });
    }
}

export const GET = withAuth(getStudio);
export const PUT = withAuth(saveStudio);
export const runtime = 'nodejs';
