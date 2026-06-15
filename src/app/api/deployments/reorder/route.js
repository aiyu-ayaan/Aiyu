import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import cache from '@/lib/cache';

export async function PATCH(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const orderedIds = Array.isArray(body?.orderedIds) ? body.orderedIds : [];

        if (orderedIds.length === 0) {
            return NextResponse.json({ error: 'orderedIds must be a non-empty array' }, { status: 400 });
        }

        if (new Set(orderedIds).size !== orderedIds.length) {
            return NextResponse.json({ error: 'orderedIds must not contain duplicates' }, { status: 400 });
        }

        const hasInvalidId = orderedIds.some((id) => typeof id !== 'string' || !id.trim());
        if (hasInvalidId) {
            return NextResponse.json({ error: 'orderedIds contains invalid deployment id values' }, { status: 400 });
        }

        const existingDeploymentsCount = await prisma.deployment.count({
            where: { id: { in: orderedIds } },
        });

        if (existingDeploymentsCount !== orderedIds.length) {
            return NextResponse.json({ error: 'One or more deployments were not found' }, { status: 404 });
        }

        await prisma.$transaction(
            orderedIds.map((id, index) =>
                prisma.deployment.update({ where: { id }, data: { displayOrder: index } })
            )
        );

        await cache.invalidatePrefixAsync('db:deployments');

        return NextResponse.json({ message: 'Deployment order updated successfully' });
    } catch {
        return NextResponse.json({ error: 'Failed to reorder deployments' }, { status: 500 });
    }
}
