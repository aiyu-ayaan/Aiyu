import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toClient } from '@/lib/serialize';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';
import { getAppLinksForProject } from '@/lib/contentLinks';
import { getLegalLinksForDeployments } from '@/lib/legal';

/**
 * GET /api/projects/:id/links — public. The apps built from a project and
 * their legal pages, for the client-side project dialog:
 * `{ apps: [{ name, href, isProduct }], legal: [{ title, href }] }`.
 */
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const row = await prisma.project.findUnique({ where: { id: String(id) } });
        if (!row) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

        const apps = await getAppLinksForProject(toClient('project', row));
        const legal = await getLegalLinksForDeployments(apps.map((app) => app.id));

        return NextResponse.json(
            { apps: apps.map(({ name, href, isProduct }) => ({ name, href, isProduct })), legal },
            { headers: createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM) },
        );
    } catch {
        return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
    }
}
