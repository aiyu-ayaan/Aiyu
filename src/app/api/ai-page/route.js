import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import cache, { CACHE_KEYS, CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';
import { DEFAULT_AI_PAGE } from '@/lib/aiPageDefaults';
import { hydrateAiSections } from '@/lib/aiSections';

/**
 * Public, read-only snapshot of the whole AI Hub (/ai) page: the ordered
 * section skeleton (from the aiPage singleton) with the four content sections
 * (skills, recommendations, credits, prompts) hydrated from their relational
 * tables. Kept for back-compat/discovery — the editable, per-section CRUD lives
 * under /api/ai/* (skills, recommendations, credits, prompts, layout).
 */
export async function GET() {
    try {
        const { value: aiPage, meta } = await cache.getOrSetWithMeta(
            CACHE_KEYS.AI_PAGE,
            async () => {
                const stored = await getSingleton(prisma, 'aiPage');
                // Serve the bundled defaults until an admin saves a skeleton, so
                // the editor and public page always have a coherent shape.
                const skeleton = !stored || !Array.isArray(stored.sections) || stored.sections.length === 0
                    ? { ...DEFAULT_AI_PAGE }
                    : stored;
                return hydrateAiSections(skeleton);
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
