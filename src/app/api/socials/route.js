import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Social from '@/models/Social';
import { getSession } from '@/lib/auth';
import cache, { CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

export async function GET() {
    await dbConnect();
    try {
        const socials = await cache.getOrSet(
            CACHE_KEYS.SOCIALS,
            () => Social.find({}).lean(),
            CACHE_TTL.LONG
        );

        return NextResponse.json(socials, {
            headers: createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_LONG),
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
        cache.invalidate(CACHE_KEYS.SOCIALS);
        cache.invalidatePrefix('db:socials');
        return NextResponse.json(social, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create social link' }, { status: 500 });
    }
}
