import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Home from '@/models/Home';
import { getSession } from '@/lib/auth';
import cache, { CACHE_KEYS, CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

export async function GET() {
    try {
        const { value: home, meta } = await cache.getOrSetWithMeta(
            CACHE_KEYS.HOME,
            async () => {
                await dbConnect();
                return Home.findOne().lean();
            },
            CACHE_TTL.LONG
        );

        return NextResponse.json(home, {
            headers: {
                ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_LONG),
                ...createCacheDebugHeaders(meta),
            },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch home data' }, { status: 500 });
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
        const home = await Home.findOneAndUpdate({}, body, {
            new: true,
            upsert: true, // Create if doesn't exist
            runValidators: true,
        });
        await cache.invalidateAsync(CACHE_KEYS.HOME);
        return NextResponse.json(home);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update home data' }, { status: 500 });
    }
}
