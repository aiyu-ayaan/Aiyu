import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton, upsertSingleton } from '@/lib/serialize';
import { getSession } from '@/lib/auth';
import cache, { CACHE_KEYS, CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';
import { DEFAULT_AI_PAGE } from '@/lib/aiPageDefaults';

export async function GET() {
    try {
        const { value: aiPage, meta } = await cache.getOrSetWithMeta(
            CACHE_KEYS.AI_PAGE,
            async () => {
                const stored = await getSingleton(prisma, 'aiPage');
                // Serve the bundled defaults until an admin saves a config, so
                // the editor and public page always have a coherent shape.
                if (!stored || !Array.isArray(stored.sections) || stored.sections.length === 0) {
                    return { ...DEFAULT_AI_PAGE };
                }
                return stored;
            },
            CACHE_TTL.LONG
        );

        return NextResponse.json(aiPage, {
            headers: {
                ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_LONG),
                ...createCacheDebugHeaders(meta),
            },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch AI page config' }, { status: 500 });
    }
}

export async function PUT(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();

        // Only the `sections` array is authoritative; guard against malformed
        // payloads so a bad save can't wipe the page into an unrenderable state.
        if (!body || !Array.isArray(body.sections)) {
            return NextResponse.json({ error: 'Invalid payload: `sections` array required' }, { status: 400 });
        }

        const aiPage = await upsertSingleton(prisma, 'aiPage', { sections: body.sections });
        await cache.invalidateAsync(CACHE_KEYS.AI_PAGE);
        await cache.invalidateAsync(`${CACHE_KEYS.AI_PAGE}:stats`);
        return NextResponse.json(aiPage);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update AI page config' }, { status: 500 });
    }
}
