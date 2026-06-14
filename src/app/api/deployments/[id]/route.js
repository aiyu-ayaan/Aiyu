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
        const deployment = await prisma.deployment.update({
            where: { id },
            data: fromClient('deployment', body, { keepId: false }),
        });
        await cache.invalidatePrefixAsync('db:deployments');
        return NextResponse.json(toClient('deployment', deployment));
    } catch (error) {
        if (error?.code === 'P2025') {
            return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to update deployment' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        await prisma.deployment.delete({ where: { id } });
        await cache.invalidatePrefixAsync('db:deployments');
        return NextResponse.json({ message: 'Deployment deleted successfully' });
    } catch (error) {
        if (error?.code === 'P2025') {
            return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to delete deployment' }, { status: 500 });
    }
}

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const { value: deployment, meta } = await cache.getOrSetWithMeta(
            `db:deployments:item:${id}`,
            async () => {
                return toClient('deployment', await prisma.deployment.findUnique({ where: { id } }));
            },
            CACHE_TTL.MEDIUM
        );

        if (!deployment) {
            return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
        }

        return NextResponse.json(deployment, {
            headers: {
                ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM),
                ...createCacheDebugHeaders(meta),
            },
        });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch deployment' }, { status: 500 });
    }
}
