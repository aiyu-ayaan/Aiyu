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
        const project = await prisma.project.update({
            where: { id },
            data: fromClient('project', body, { keepId: false }),
        });
        await cache.invalidatePrefixAsync('db:projects');
        return NextResponse.json(toClient('project', project));
    } catch (error) {
        if (error?.code === 'P2025') {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        await prisma.project.delete({ where: { id } });
        await cache.invalidatePrefixAsync('db:projects');
        return NextResponse.json({ message: 'Project deleted successfully' });
    } catch (error) {
        if (error?.code === 'P2025') {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
}

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const { value: project, meta } = await cache.getOrSetWithMeta(
            `db:projects:item:${id}`,
            async () => {
                return toClient('project', await prisma.project.findUnique({ where: { id } }));
            },
            CACHE_TTL.MEDIUM
        );

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json(project, {
            headers: {
                ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM),
                ...createCacheDebugHeaders(meta),
            },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
    }
}
