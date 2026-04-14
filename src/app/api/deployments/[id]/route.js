import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Deployment from '@/models/Deployment';
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
        const deployment = await Deployment.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });

        if (!deployment) {
            return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
        }

        await cache.invalidatePrefixAsync('db:deployments');

        return NextResponse.json(deployment);
    } catch {
        return NextResponse.json({ error: 'Failed to update deployment' }, { status: 500 });
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
        const deployment = await Deployment.findByIdAndDelete(id);

        if (!deployment) {
            return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
        }

        await cache.invalidatePrefixAsync('db:deployments');

        return NextResponse.json({ message: 'Deployment deleted successfully' });
    } catch {
        return NextResponse.json({ error: 'Failed to delete deployment' }, { status: 500 });
    }
}

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const { value: deployment, meta } = await cache.getOrSetWithMeta(
            `db:deployments:item:${id}`,
            async () => {
                await dbConnect();
                return Deployment.findById(id).lean();
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
