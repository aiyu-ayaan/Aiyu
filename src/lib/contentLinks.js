/**
 * Cross-links between an /apps entry (Deployment) and the /projects entry it
 * is built from (Deployment.projectId). The two pages stay separate canonical
 * URLs — the app page is about using the product, the project page about how
 * it is built — and these helpers let each point at the other so readers and
 * crawlers can move between them.
 */
import { prisma } from '@/lib/prisma';
import { toClient, toClientList } from '@/lib/serialize';
import { getDeploymentSlug, getProjectSlug } from '@/lib/contentSlugs';

/** `{ name, href }` for the project an app is linked to, or null. */
export async function getProjectLinkForDeployment(deployment) {
    const projectId = deployment?.projectId;
    if (!projectId) return null;
    const row = await prisma.project.findUnique({ where: { id: String(projectId) } });
    if (!row) return null;
    const project = toClient('project', row);
    return { name: project.name, href: `/projects/${getProjectSlug(project)}` };
}

/**
 * `[{ id, name, href, hostedUrl, isProduct }]` for every app linked to a project.
 * `href` is the app's canonical page: its product page (/<slug>) when one is
 * linked, else /apps/<slug>. `isProduct` tells callers not to version-prefix it.
 */
export async function getAppLinksForProject(project) {
    if (!project?._id) return [];
    const rows = await prisma.deployment.findMany({
        where: { projectId: String(project._id) },
        orderBy: { displayOrder: 'asc' },
    });
    const products = await prisma.legalApp.findMany({
        where: { deploymentId: { in: rows.map((row) => row.id) } },
        orderBy: { createdAt: 'asc' },
        select: { slug: true, deploymentId: true },
    });
    const productPathById = new Map();
    for (const product of products) {
        if (!productPathById.has(product.deploymentId)) productPathById.set(product.deploymentId, `/${product.slug}`);
    }
    return toClientList('deployment', rows).map((deployment) => {
        const productPath = productPathById.get(deployment._id);
        return {
            id: deployment._id,
            name: deployment.name,
            href: productPath || `/apps/${getDeploymentSlug(deployment)}`,
            hostedUrl: deployment.hostedUrl || '',
            isProduct: Boolean(productPath),
        };
    });
}

/**
 * Normalize an incoming `projectId` for a deployment write: '' / null unlinks,
 * an unknown id throws (so a typo can never create a dangling link), and
 * `undefined` means "leave unchanged".
 */
export async function normalizeProjectIdInput(value) {
    if (value === undefined) return undefined;
    const id = String(value || '').trim();
    if (!id) return null;
    const exists = await prisma.project.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
        const error = new Error('Linked project not found');
        error.status = 400;
        throw error;
    }
    return id;
}
