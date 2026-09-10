import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toClient, fromClient } from '@/lib/serialize';
import { getSession } from '@/lib/auth';
import cache, { CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';
import { getProjectSlug } from '@/lib/contentSlugs';
import { autoPing } from '@/lib/autoIndexing';
import { PINNABLE_FIELDS, withPinnedFields } from '@/lib/githubProjects';

export async function PUT(request, { params }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const data = fromClient('project', body, { keepId: false });

        // Editing a synced project pins the fields you touched, so the next
        // GitHub sync leaves your wording alone (see lib/githubProjects.js).
        // An explicit `pinnedFields` in the body wins — that is the admin
        // un-pinning a field to hand it back to sync.
        const existing = await prisma.project.findUnique({
            where: { id },
            select: { source: true, pinnedFields: true, ...Object.fromEntries(PINNABLE_FIELDS.map((f) => [f, true])) },
        });

        if (existing?.source === 'github' && body.pinnedFields === undefined) {
            const changed = PINNABLE_FIELDS.filter((field) => (
                data[field] !== undefined
                && JSON.stringify(data[field]) !== JSON.stringify(existing[field])
            ));
            if (changed.length > 0) {
                data.pinnedFields = withPinnedFields(existing.pinnedFields, changed);
            }
        }

        const project = await prisma.project.update({
            where: { id },
            data,
        });
        await cache.invalidatePrefixAsync('db:projects');
        const updated = toClient('project', project);
        autoPing([`/projects/${getProjectSlug(updated)}`, '/projects']);
        return NextResponse.json(updated);
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
        const project = await prisma.project.delete({ where: { id } });
        await cache.invalidatePrefixAsync('db:projects');
        autoPing([`/projects/${getProjectSlug(toClient('project', project))}`], 'URL_DELETED');
        autoPing(['/projects']);
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
