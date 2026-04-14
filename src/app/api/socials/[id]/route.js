import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Social from '@/models/Social';
import { getSession } from '@/lib/auth';
import cache, { CACHE_KEYS, CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

export async function PUT(request, { params }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    try {
        const { id } = await params;
        const body = await request.json();
        const social = await Social.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });
        if (!social) {
            return NextResponse.json({ error: 'Social link not found' }, { status: 404 });
        }
        await cache.invalidatePrefixAsync('db:socials');
        return NextResponse.json(social);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update social link' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    try {
        const { id } = await params;
        const social = await Social.findByIdAndDelete(id);
        if (!social) {
            return NextResponse.json({ error: 'Social link not found' }, { status: 404 });
        }
        await cache.invalidatePrefixAsync('db:socials');
        return NextResponse.json({ message: 'Social link deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete social link' }, { status: 500 });
    }
}

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const { value: social, meta } = await cache.getOrSetWithMeta(
            `db:socials:item:${id}`,
            async () => {
                await dbConnect();
                return Social.findById(id).lean();
            },
            CACHE_TTL.LONG
        );

        if (!social) {
            return NextResponse.json({ error: 'Social link not found' }, { status: 404 });
        }

        return NextResponse.json(social, {
            headers: {
                ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_LONG),
                ...createCacheDebugHeaders(meta),
            },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch social link' }, { status: 500 });
    }
}
