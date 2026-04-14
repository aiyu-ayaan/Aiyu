import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Deployment from '@/models/Deployment';
import { getSession } from '@/lib/auth';
import cache, { CACHE_KEYS, CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

const getDisplayOrderValue = (deployment) => {
    const parsedOrder = Number.parseInt(deployment?.displayOrder, 10);
    return Number.isNaN(parsedOrder) ? Number.MAX_SAFE_INTEGER : parsedOrder;
};

const sortDeployments = (deployments = []) => {
    return [...deployments].sort((a, b) => {
        const orderDifference = getDisplayOrderValue(a) - getDisplayOrderValue(b);
        if (orderDifference !== 0) return orderDifference;

        const firstUpdatedAt = new Date(a?.updatedAt || 0).getTime();
        const secondUpdatedAt = new Date(b?.updatedAt || 0).getTime();
        return secondUpdatedAt - firstUpdatedAt;
    });
};

export async function GET() {
    try {
        const { value: deployments, meta } = await cache.getOrSetWithMeta(
            CACHE_KEYS.DEPLOYMENTS,
            async () => {
                await dbConnect();
                const allDeployments = await Deployment.find({}).lean();
                return sortDeployments(allDeployments);
            },
            CACHE_TTL.MEDIUM
        );

        return NextResponse.json(deployments, {
            headers: {
                ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM),
                ...createCacheDebugHeaders(meta),
            },
        });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch deployments' }, { status: 500 });
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
        const payload = { ...body };

        if (!Number.isFinite(payload.displayOrder)) {
            const maxOrderedDeployment = await Deployment.findOne({ displayOrder: { $type: 'number' } })
                .sort({ displayOrder: -1 })
                .select('displayOrder')
                .lean();

            payload.displayOrder = Number.isFinite(maxOrderedDeployment?.displayOrder)
                ? maxOrderedDeployment.displayOrder + 1
                : 0;
        }

        const deployment = await Deployment.create(payload);
        await cache.invalidatePrefixAsync('db:deployments');
        return NextResponse.json(deployment, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Failed to create deployment' }, { status: 500 });
    }
}
