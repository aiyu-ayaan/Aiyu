import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton, upsertSingleton } from '@/lib/serialize';
import { getSession } from '@/lib/auth';
import cache, { CACHE_KEYS, CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

export async function GET() {
    try {
        const { value: header, meta } = await cache.getOrSetWithMeta(
            CACHE_KEYS.HEADER,
            async () => {
                return getSingleton(prisma, 'header');
            },
            CACHE_TTL.LONG
        );

        return NextResponse.json(header, {
            headers: {
                ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_LONG),
                ...createCacheDebugHeaders(meta),
            },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch header data' }, { status: 500 });
    }
}

export async function PUT(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const header = await upsertSingleton(prisma, 'header', body);
        await cache.invalidateAsync(CACHE_KEYS.HEADER);
        return NextResponse.json(header);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update header data' }, { status: 500 });
    }
}
