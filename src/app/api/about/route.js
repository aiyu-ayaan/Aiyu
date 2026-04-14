import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import About from '@/models/About';
import { getSession } from '@/lib/auth';
import cache, { CACHE_KEYS, CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

export async function GET() {
    try {
        const { value: about, meta } = await cache.getOrSetWithMeta(
            CACHE_KEYS.ABOUT,
            async () => {
                await dbConnect();
                return About.findOne().lean();
            },
            CACHE_TTL.LONG
        );

        return NextResponse.json(about, {
            headers: {
                ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_LONG),
                ...createCacheDebugHeaders(meta),
            },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch about data' }, { status: 500 });
    }
}

export async function PUT(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    try {
        const body = await request.json();
        const about = await About.findOneAndUpdate({}, body, {
            new: true,
            upsert: true,
            runValidators: true,
        });
        await cache.invalidatePrefixAsync('db:about');
        return NextResponse.json(about);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update about data' }, { status: 500 });
    }
}
