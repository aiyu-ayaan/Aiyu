import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Social from '@/models/Social';
import { getSession } from '@/lib/auth';
import cache, { CACHE_KEYS, CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

export async function GET() {
    try {
        const { value: socials, meta } = await cache.getOrSetWithMeta(
            CACHE_KEYS.SOCIALS,
            async () => {
                await dbConnect();
                return Social.find({}).lean();
            },
            CACHE_TTL.LONG
        );

        return NextResponse.json(socials, {
            headers: {
                ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_LONG),
                ...createCacheDebugHeaders(meta),
            },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch socials' }, { status: 500 });
    }
}

export async function POST(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    try {
        const body = await request.json();
        const social = await Social.create(body);
        await cache.invalidatePrefixAsync('db:socials');
        return NextResponse.json(social, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create social link' }, { status: 500 });
    }
}
