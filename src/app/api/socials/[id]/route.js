import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toClient, fromClient } from '@/lib/serialize';
import { getSession } from '@/lib/auth';
import cache, { CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

export async function PUT(request, { params }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const social = await prisma.social.update({
            where: { id },
            data: fromClient('social', body, { keepId: false }),
        });
        await cache.invalidatePrefixAsync('db:socials');
        return NextResponse.json(toClient('social', social));
    } catch (error) {
        if (error?.code === 'P2025') {
            return NextResponse.json({ error: 'Social link not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to update social link' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        await prisma.social.delete({ where: { id } });
        await cache.invalidatePrefixAsync('db:socials');
        return NextResponse.json({ message: 'Social link deleted successfully' });
    } catch (error) {
        if (error?.code === 'P2025') {
            return NextResponse.json({ error: 'Social link not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to delete social link' }, { status: 500 });
    }
}

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const { value: social, meta } = await cache.getOrSetWithMeta(
            `db:socials:item:${id}`,
            async () => {
                return toClient('social', await prisma.social.findUnique({ where: { id } }));
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
