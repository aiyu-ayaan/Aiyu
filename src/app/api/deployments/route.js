import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toClient, toClientList, fromClient } from '@/lib/serialize';
import { getSession } from '@/lib/auth';
import cache, { CACHE_KEYS, CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';
import { getDeploymentSlug } from '@/lib/contentSlugs';
import { autoPing } from '@/lib/autoIndexing';

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
                const allDeployments = toClientList('deployment', await prisma.deployment.findMany());
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

    try {
        const body = await request.json();
        const payload = { ...body };

        if (!Number.isFinite(payload.displayOrder)) {
            const maxOrderedDeployment = await prisma.deployment.findFirst({
                orderBy: { displayOrder: 'desc' },
                select: { displayOrder: true },
            });

            payload.displayOrder = Number.isFinite(maxOrderedDeployment?.displayOrder)
                ? maxOrderedDeployment.displayOrder + 1
                : 0;
        }

        const deployment = await prisma.deployment.create({ data: fromClient('deployment', payload, { keepId: false }) });
        await cache.invalidatePrefixAsync('db:deployments');
        const created = toClient('deployment', deployment);
        autoPing([`/apps/${getDeploymentSlug(created)}`, '/apps']);
        return NextResponse.json(created, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Failed to create deployment' }, { status: 500 });
    }
}
