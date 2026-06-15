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

        const hasDuplicates = new Set(orderedIds).size !== orderedIds.length;
        if (hasDuplicates) {
            return NextResponse.json({ error: 'orderedIds must not contain duplicates' }, { status: 400 });
        }

        const hasInvalidId = orderedIds.some((id) => typeof id !== 'string' || !id.trim());
        if (hasInvalidId) {
            return NextResponse.json({ error: 'orderedIds contains invalid project id values' }, { status: 400 });
        }

        const existingProjectsCount = await prisma.project.count({
            where: { id: { in: orderedIds } },
        });

        if (existingProjectsCount !== orderedIds.length) {
            return NextResponse.json({ error: 'One or more projects were not found' }, { status: 404 });
        }

        await prisma.$transaction(
            orderedIds.map((id, index) =>
                prisma.project.update({ where: { id }, data: { displayOrder: index } })
            )
        );

        await cache.invalidatePrefixAsync('db:projects');

        return NextResponse.json({ message: 'Project order updated successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to reorder projects' }, { status: 500 });
    }
}
