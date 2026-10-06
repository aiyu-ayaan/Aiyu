import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toClient } from '@/lib/serialize';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';
import { getProjectLinkForDeployment } from '@/lib/contentLinks';
import { getLegalLinksForDeployment, getProductPathForDeployment } from '@/lib/legal';

/**
 * GET /api/deployments/:id/links — public. Everything an app links to, for the
 * client-side app dialog: `{ productHref, project: { name, href } | null,
 * legal: [{ title, href }] }`.
 */
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const row = await prisma.deployment.findUnique({ where: { id: String(id) } });
        if (!row) return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });

        const deployment = toClient('deployment', row);
        const [productHref, project, legal] = await Promise.all([
            getProductPathForDeployment(deployment._id),
            getProjectLinkForDeployment(deployment),
            getLegalLinksForDeployment(deployment._id),
        ]);

        return NextResponse.json(
            { productHref, project, legal: legal?.links || [] },
            { headers: createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM) },
        );
    } catch {
        return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
    }
}
