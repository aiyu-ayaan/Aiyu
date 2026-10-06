/**
 * Legal pages — per-application privacy policies, terms, and custom documents.
 *
 * Public URLs:
 *   /<app slug>               hub listing every published document of the app
 *   /<app slug>/<doc slug>    one document, e.g. /rewire/privacy-policy
 *
 * Those live at the site root (src/app/[legalApp]), so an app slug must never
 * shadow a real top-level route — see RESERVED_LEGAL_SLUGS.
 *
 * This module is the single source of truth for validation, slug rules, reads,
 * writes and cache invalidation; the admin REST routes and the public pages
 * both go through it.
 */
import { prisma } from '@/lib/prisma';
import { toClient, toClientList } from '@/lib/serialize';
import cache, { CACHE_TTL } from '@/lib/cache';
import { generateSlug } from '@/lib/seoHelper';
import { autoPing } from '@/lib/autoIndexing';
import { getDeploymentSlug, getProjectSlug } from '@/lib/contentSlugs';
import { LEGAL_KINDS, LEGAL_FORMATS, legalKindLabel } from '@/lib/legalKinds';

export { LEGAL_KINDS, LEGAL_FORMATS };

const CACHE_PREFIX = 'db:legal';

const KIND_VALUES = new Set(LEGAL_KINDS.map((k) => k.value));

/**
 * First path segments an app slug may not take: real top-level routes, the
 * site-versioned public pages the proxy rewrites, permanent-redirect sources
 * from next.config, and folders served from /public.
 */
export const RESERVED_LEGAL_SLUGS = new Set([
    'admin', 'api', 'v1', 'v2', 'docs', 'games', 'desktop', 'workers',
    'apps', 'projects', 'blogs', 'gallery', 'github', 'ai', 'about-me',
    'contact-us', 'sitemap', 'work-in-progress', 'live-deployments',
    'about', 'contact', 'blog', 'app', 'project', 'deployments',
    'uploads', 'images', 'public', 'doom', 'hf', 'screenshots',
    'legal', 'resume', 'search', 'login', 'auth',
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A validation/not-found error carrying an HTTP status for the REST layer. */
export class LegalError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = 'LegalError';
        this.status = status;
    }
}

// ───────────────────────────── validation ─────────────────────────────

function str(value, field, { required = false, max = 2000 } = {}) {
    if (value === undefined || value === null) {
        if (required) throw new LegalError(`Missing required field: ${field}`);
        return undefined;
    }
    const s = String(value).trim();
    if (required && !s) throw new LegalError(`Field "${field}" must not be empty.`);
    if (s.length > max) throw new LegalError(`Field "${field}" exceeds ${max} characters.`);
    return s;
}

function normalizeSlug(value, fallback) {
    const slug = generateSlug(String(value || '').trim() || String(fallback || ''))
        .replace(/_/g, '-')
        .replace(/^-+|-+$/g, '');
    if (!slug || !SLUG_PATTERN.test(slug)) {
        throw new LegalError('Slug may only contain lowercase letters, numbers and single hyphens.');
    }
    return slug;
}

function appSlug(value, fallback) {
    const slug = normalizeSlug(value, fallback);
    if (RESERVED_LEGAL_SLUGS.has(slug)) {
        throw new LegalError(`"${slug}" is a reserved site path. Pick another slug.`);
    }
    return slug;
}

/** Package names look like reverse-DNS ids (com.example.app). Optional. */
function packageName(value) {
    const s = str(value, 'packageName', { max: 255 });
    if (s === undefined) return undefined;
    if (s && !/^[A-Za-z][\w]*(\.[A-Za-z_][\w]*)+$/.test(s)) {
        throw new LegalError('Package name must look like com.example.app.');
    }
    return s;
}

async function optionalDeploymentId(value) {
    if (value === undefined) return undefined;
    const id = String(value || '').trim();
    if (!id) return null;
    const exists = await prisma.deployment.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new LegalError('Linked app not found.', 404);
    return id;
}

function isUniqueViolation(error) {
    return error?.code === 'P2002';
}

// ───────────────────────────── paths & cache ─────────────────────────────

export function legalAppPath(app) {
    return `/${app.slug}`;
}

export function legalDocumentPath(app, doc) {
    return `/${app.slug}/${doc.slug}`;
}

async function invalidate(paths = []) {
    await cache.invalidatePrefixAsync(CACHE_PREFIX);
    // App detail pages render the linked app's legal links.
    await cache.invalidatePrefixAsync('db:deployments');
    if (paths.length > 0) autoPing(paths);
}

function documentPaths(app, docs = []) {
    return [legalAppPath(app), ...docs.filter((d) => d.published && !d.noIndex).map((d) => legalDocumentPath(app, d))];
}

// ───────────────────────────── admin: apps ─────────────────────────────

/** Every legal app with its documents (drafts included), newest first. */
export async function listLegalApps() {
    const rows = await prisma.legalApp.findMany({
        orderBy: { createdAt: 'desc' },
        include: { documents: { orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }] } },
    });
    return rows.map(shapeAppWithDocs);
}

export async function getLegalApp(id) {
    const row = await prisma.legalApp.findUnique({
        where: { id: String(id) },
        include: { documents: { orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }] } },
    });
    if (!row) throw new LegalError('Legal app not found.', 404);
    return shapeAppWithDocs(row);
}

function shapeAppWithDocs(row) {
    const { documents = [], ...app } = row;
    return { ...toClient('legalApp', app), documents: toClientList('legalDocument', documents) };
}

export async function createLegalApp(input = {}) {
    const name = str(input.name, 'name', { required: true, max: 120 });
    const data = {
        name,
        slug: appSlug(input.slug, name),
        packageName: packageName(input.packageName) || '',
        description: str(input.description, 'description', { max: 500 }) || '',
        contactEmail: str(input.contactEmail, 'contactEmail', { max: 200 }) || '',
        deploymentId: (await optionalDeploymentId(input.deploymentId)) ?? null,
    };

    try {
        const row = await prisma.legalApp.create({ data });
        await invalidate([legalAppPath(row)]);
        return getLegalApp(row.id);
    } catch (error) {
        if (isUniqueViolation(error)) throw new LegalError(`Slug "${data.slug}" is already used by another legal app.`, 409);
        throw error;
    }
}

export async function updateLegalApp(id, patch = {}) {
    const existing = await getLegalApp(id);
    const data = {};
    if (patch.name !== undefined) data.name = str(patch.name, 'name', { required: true, max: 120 });
    if (patch.slug !== undefined) data.slug = appSlug(patch.slug, data.name || existing.name);
    if (patch.packageName !== undefined) data.packageName = packageName(patch.packageName) || '';
    if (patch.description !== undefined) data.description = str(patch.description, 'description', { max: 500 }) || '';
    if (patch.contactEmail !== undefined) data.contactEmail = str(patch.contactEmail, 'contactEmail', { max: 200 }) || '';
    if (patch.deploymentId !== undefined) data.deploymentId = await optionalDeploymentId(patch.deploymentId);

    try {
        await prisma.legalApp.update({ where: { id: existing._id }, data });
    } catch (error) {
        if (isUniqueViolation(error)) throw new LegalError(`Slug "${data.slug}" is already used by another legal app.`, 409);
        throw error;
    }

    const updated = await getLegalApp(existing._id);
    if (updated.slug !== existing.slug) {
        autoPing(documentPaths(existing, existing.documents), 'URL_DELETED');
    }
    await invalidate(documentPaths(updated, updated.documents));
    return updated;
}

export async function deleteLegalApp(id) {
    const existing = await getLegalApp(id);
    await prisma.legalApp.delete({ where: { id: existing._id } });
    autoPing(documentPaths(existing, existing.documents), 'URL_DELETED');
    await invalidate();
    return { deletedId: existing._id };
}

// ───────────────────────────── admin: documents ─────────────────────────────

function kind(value) {
    const k = String(value || 'custom').trim();
    if (!KIND_VALUES.has(k)) throw new LegalError(`Unknown document kind "${k}".`);
    return k;
}

function format(value) {
    const f = String(value || 'markdown').trim().toLowerCase();
    if (!LEGAL_FORMATS.includes(f)) throw new LegalError('Format must be "markdown" or "html".');
    return f;
}

export async function createLegalDocument(appId, input = {}) {
    const app = await getLegalApp(appId);
    const docKind = kind(input.kind);
    const title = str(input.title, 'title', { max: 160 }) || (docKind === 'custom' ? '' : legalKindLabel(docKind));
    if (!title) throw new LegalError('Field "title" must not be empty.');

    const last = app.documents[app.documents.length - 1];
    const hasOrder = input.displayOrder !== undefined && input.displayOrder !== null && input.displayOrder !== ''
        && Number.isFinite(Number(input.displayOrder));
    const data = {
        appId: app._id,
        kind: docKind,
        title,
        slug: normalizeSlug(input.slug, docKind === 'custom' ? title : docKind),
        format: format(input.format),
        content: str(input.content, 'content', { max: 500000 }) || '',
        seoDescription: str(input.seoDescription, 'seoDescription', { max: 300 }) || '',
        effectiveDate: str(input.effectiveDate, 'effectiveDate', { max: 40 }) || '',
        published: input.published === undefined ? true : Boolean(input.published),
        noIndex: Boolean(input.noIndex),
        displayOrder: hasOrder ? Math.round(Number(input.displayOrder)) : (last ? last.displayOrder + 1 : 0),
    };

    try {
        const row = await prisma.legalDocument.create({ data });
        const doc = toClient('legalDocument', row);
        await invalidate(doc.published ? [legalAppPath(app), legalDocumentPath(app, doc)] : []);
        return doc;
    } catch (error) {
        if (isUniqueViolation(error)) throw new LegalError(`"${app.slug}/${data.slug}" already exists.`, 409);
        throw error;
    }
}

export async function getLegalDocument(id) {
    const row = await prisma.legalDocument.findUnique({ where: { id: String(id) }, include: { app: true } });
    if (!row) throw new LegalError('Legal page not found.', 404);
    const { app, ...doc } = row;
    return { ...toClient('legalDocument', doc), app: toClient('legalApp', app) };
}

export async function updateLegalDocument(id, patch = {}) {
    const existing = await getLegalDocument(id);
    const data = {};
    if (patch.kind !== undefined) data.kind = kind(patch.kind);
    if (patch.title !== undefined) data.title = str(patch.title, 'title', { required: true, max: 160 });
    if (patch.slug !== undefined) data.slug = normalizeSlug(patch.slug, data.title || existing.title);
    if (patch.format !== undefined) data.format = format(patch.format);
    if (patch.content !== undefined) data.content = str(patch.content, 'content', { max: 500000 }) || '';
    if (patch.seoDescription !== undefined) data.seoDescription = str(patch.seoDescription, 'seoDescription', { max: 300 }) || '';
    if (patch.effectiveDate !== undefined) data.effectiveDate = str(patch.effectiveDate, 'effectiveDate', { max: 40 }) || '';
    if (patch.published !== undefined) data.published = Boolean(patch.published);
    if (patch.noIndex !== undefined) data.noIndex = Boolean(patch.noIndex);
    if (patch.displayOrder !== undefined && Number.isFinite(Number(patch.displayOrder))) {
        data.displayOrder = Math.round(Number(patch.displayOrder));
    }

    let row;
    try {
        row = await prisma.legalDocument.update({ where: { id: existing._id }, data });
    } catch (error) {
        if (isUniqueViolation(error)) throw new LegalError(`"${existing.app.slug}/${data.slug}" already exists.`, 409);
        throw error;
    }

    const doc = toClient('legalDocument', row);
    if (doc.slug !== existing.slug || (existing.published && !doc.published)) {
        autoPing([legalDocumentPath(existing.app, existing)], 'URL_DELETED');
    }
    await invalidate(doc.published && !doc.noIndex
        ? [legalAppPath(existing.app), legalDocumentPath(existing.app, doc)]
        : [legalAppPath(existing.app)]);
    return doc;
}

export async function deleteLegalDocument(id) {
    const existing = await getLegalDocument(id);
    await prisma.legalDocument.delete({ where: { id: existing._id } });
    if (existing.published) autoPing([legalDocumentPath(existing.app, existing)], 'URL_DELETED');
    await invalidate([legalAppPath(existing.app)]);
    return { deletedId: existing._id };
}

// ───────────────────────────── public reads ─────────────────────────────

/** A legal app by slug with only its published documents, or null. */
export async function getPublicLegalApp(slug) {
    const normalized = String(slug || '').trim().toLowerCase();
    if (!normalized || !SLUG_PATTERN.test(normalized) || RESERVED_LEGAL_SLUGS.has(normalized)) return null;

    return cache.getOrSet(`${CACHE_PREFIX}:app:${normalized}`, async () => {
        const row = await prisma.legalApp.findUnique({
            where: { slug: normalized },
            include: {
                documents: {
                    where: { published: true },
                    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
                },
            },
        });
        return row ? shapeAppWithDocs(row) : null;
    }, CACHE_TTL.MEDIUM);
}

/** `{ app, document }` for /<app>/<doc>, or null when either is missing/unpublished. */
export async function getPublicLegalDocument(appSlugValue, docSlug) {
    const app = await getPublicLegalApp(appSlugValue);
    if (!app) return null;
    const document = app.documents.find((d) => d.slug === String(docSlug || '').trim().toLowerCase());
    return document ? { app, document } : null;
}

/**
 * Legal links for an /apps entry: `{ name, href, links:[{ title, href }] }`, or
 * null when no legal app points at this deployment (or it has nothing published).
 */
export async function getLegalLinksForDeployment(deploymentId) {
    if (!deploymentId) return null;
    return cache.getOrSet(`${CACHE_PREFIX}:deployment:${deploymentId}`, async () => {
        const row = await prisma.legalApp.findFirst({
            where: { deploymentId: String(deploymentId) },
            orderBy: { createdAt: 'asc' },
            include: {
                documents: {
                    where: { published: true },
                    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
                    select: { title: true, slug: true },
                },
            },
        });
        if (!row || row.documents.length === 0) return null;
        return {
            name: row.name,
            packageName: row.packageName || '',
            href: legalAppPath(row),
            links: row.documents.map((d) => ({ title: d.title, href: legalDocumentPath(row, d) })),
        };
    }, CACHE_TTL.MEDIUM);
}

/** The /apps entry a legal app is linked to, as `{ name, href, hostedUrl }`, or null. */
export async function getLinkedDeployment(app) {
    if (!app?.deploymentId) return null;
    const row = await prisma.deployment.findUnique({ where: { id: app.deploymentId } });
    if (!row) return null;
    const deployment = toClient('deployment', row);
    return {
        name: deployment.name,
        href: `/apps/${getDeploymentSlug(deployment)}`,
        hostedUrl: deployment.hostedUrl || '',
    };
}

/**
 * Card data for the legal hub: the linked /apps entry and, through it, the
 * /projects entry it is built from. `{ app, project }`, either may be null.
 */
export async function getLegalAppShowcase(legalApp) {
    if (!legalApp?.deploymentId) return { app: null, project: null };
    const deploymentRow = await prisma.deployment.findUnique({ where: { id: legalApp.deploymentId } });
    if (!deploymentRow) return { app: null, project: null };

    const deployment = toClient('deployment', deploymentRow);
    const app = {
        name: deployment.name,
        description: deployment.description || '',
        image: deployment.image || '',
        status: deployment.status || '',
        type: deployment.appType || '',
        techStack: Array.isArray(deployment.techStack) ? deployment.techStack : [],
        externalUrl: deployment.hostedUrl || '',
        href: `/apps/${getDeploymentSlug(deployment)}`,
    };

    const projectRow = deployment.projectId
        ? await prisma.project.findUnique({ where: { id: deployment.projectId } })
        : null;
    if (!projectRow) return { app, project: null };

    const project = toClient('project', projectRow);
    const repo = project.repoData || {};
    return {
        app,
        project: {
            name: project.name,
            description: project.description || '',
            image: project.image || '',
            status: project.status || '',
            type: [project.projectType, project.year].filter(Boolean).join(' · '),
            techStack: Array.isArray(project.techStack) ? project.techStack : [],
            externalUrl: project.codeLink || '',
            language: repo.language || '',
            stars: Number(repo.stars) || 0,
            href: `/projects/${getProjectSlug(project)}`,
        },
    };
}

/**
 * The main product page for an /apps entry: `/<legal app slug>` when a legal
 * app is linked to it, else null. That page is the canonical home of the
 * product, so /apps/<slug> points its canonical here to consolidate ranking
 * signals onto one URL instead of splitting them across two similar pages.
 */
export async function getProductPathForDeployment(deploymentId) {
    if (!deploymentId) return null;
    const path = await cache.getOrSet(`${CACHE_PREFIX}:product:${deploymentId}`, async () => {
        const row = await prisma.legalApp.findFirst({
            where: { deploymentId: String(deploymentId) },
            orderBy: { createdAt: 'asc' },
            select: { slug: true },
        });
        // Cache misses as '' so unlinked apps do not query on every request.
        return row ? legalAppPath(row) : '';
    }, CACHE_TTL.MEDIUM);
    return path || null;
}

/** Map of deploymentId -> product path, for the sitemap. */
export async function listProductPathsByDeployment() {
    const rows = await prisma.legalApp.findMany({
        where: { NOT: { deploymentId: null } },
        orderBy: { createdAt: 'asc' },
        select: { slug: true, deploymentId: true },
    });
    const map = new Map();
    for (const row of rows) {
        if (!map.has(row.deploymentId)) map.set(row.deploymentId, legalAppPath(row));
    }
    return map;
}

/** De-duplicated legal links (`[{ title, href }]`) for several deployment ids. */
export async function getLegalLinksForDeployments(deploymentIds = []) {
    const sets = await Promise.all(deploymentIds.map((id) => getLegalLinksForDeployment(id)));
    const seen = new Set();
    return sets.flatMap((set) => set?.links || []).filter((link) => {
        if (seen.has(link.href)) return false;
        seen.add(link.href);
        return true;
    });
}

/**
 * Indexable URLs for the sitemap: `[{ path, updatedAt, isProduct }]`. A hub
 * linked to an /apps entry is the product's main page (`isProduct`) and is
 * listed even before any legal page is published.
 */
export async function listIndexableLegalPaths() {
    const apps = await prisma.legalApp.findMany({
        include: { documents: { where: { published: true, noIndex: false }, select: { slug: true, updatedAt: true } } },
    });
    // deploymentId is a soft reference; only count links that still resolve.
    const linkedIds = apps.map((app) => app.deploymentId).filter(Boolean);
    const liveDeployments = new Set(linkedIds.length === 0 ? [] : (await prisma.deployment.findMany({
        where: { id: { in: linkedIds } },
        select: { id: true },
    })).map((row) => row.id));

    const entries = [];
    for (const app of apps) {
        const isProduct = liveDeployments.has(app.deploymentId);
        if (app.documents.length === 0 && !isProduct) continue;
        const newest = app.documents.reduce((max, d) => (d.updatedAt > max ? d.updatedAt : max), app.updatedAt);
        entries.push({ path: legalAppPath(app), updatedAt: newest, isProduct });
        for (const doc of app.documents) {
            entries.push({ path: legalDocumentPath(app, doc), updatedAt: doc.updatedAt });
        }
    }
    return entries;
}
