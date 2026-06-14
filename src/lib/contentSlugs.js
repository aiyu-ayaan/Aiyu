import { prisma } from '@/lib/prisma';
import { toClient, toClientList } from '@/lib/serialize';
import { generateSlug } from '@/lib/seoHelper';

// As with blogSlugs.js, the leading `_model` parameter on the public helpers is
// retained for backward compatibility and ignored; lookups use Prisma directly.

function getStoredSlug(entry) {
    const raw = typeof entry?.slug === 'string' ? entry.slug.trim() : '';
    return raw || '';
}

function getFallbackSlugBase(name, id, prefix) {
    const generated = generateSlug(name);
    if (generated) {
        return generated;
    }

    const safeId = typeof id === 'string' ? id : String(id || '');
    const suffix = safeId.slice(-6) || 'entry';
    return `${prefix}-${suffix}`;
}

function getEntitySlug(entry, options) {
    const storedSlug = getStoredSlug(entry);
    if (storedSlug) {
        return storedSlug;
    }

    return getFallbackSlugBase(entry?.[options.nameField], entry?._id, options.prefix);
}

async function createUniqueEntitySlug(options, name, excludeId = null, fallbackId = null) {
    const baseSlug = getFallbackSlugBase(name, fallbackId, options.prefix);
    let candidate = baseSlug;
    let suffix = 2;

    while (true) {
        const existing = await prisma[options.delegate].findFirst({
            where: {
                slug: candidate,
                ...(excludeId ? { NOT: { id: excludeId } } : {}),
            },
            select: { id: true },
        });

        if (!existing) {
            return candidate;
        }

        candidate = `${baseSlug}-${suffix}`;
        suffix += 1;
    }
}

async function ensureEntitySlugForDocument(options, entry) {
    if (!entry?._id) {
        return entry;
    }

    const storedSlug = getStoredSlug(entry);
    if (storedSlug) {
        return entry;
    }

    const slug = await createUniqueEntitySlug(options, entry?.[options.nameField], entry._id, entry._id);

    await prisma[options.delegate].updateMany({
        where: { id: entry._id, slug: '' },
        data: { slug },
    });

    return {
        ...entry,
        slug,
    };
}

async function backfillMissingEntitySlugs(options) {
    const missingEntries = await prisma[options.delegate].findMany({
        where: { slug: '' },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, [options.nameField]: true, slug: true },
    });

    if (missingEntries.length === 0) {
        return;
    }

    const existingSlugRows = await prisma[options.delegate].findMany({
        where: { NOT: { slug: '' } },
        select: { slug: true },
    });

    const usedSlugs = new Set(
        existingSlugRows.map((entry) => getStoredSlug(entry)).filter(Boolean)
    );

    for (const entry of missingEntries) {
        const baseSlug = getFallbackSlugBase(entry?.[options.nameField], entry?.id, options.prefix);
        let slug = baseSlug;
        let suffix = 2;

        while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }

        usedSlugs.add(slug);
        await prisma[options.delegate].update({ where: { id: entry.id }, data: { slug } });
    }
}

async function resolveEntityByIdentifier(options, identifier) {
    const normalizedIdentifier = String(identifier || '').trim();
    if (!normalizedIdentifier) {
        return null;
    }

    const bySlug = await prisma[options.delegate].findFirst({ where: { slug: normalizedIdentifier } });
    if (bySlug) {
        return toClient(options.key, bySlug);
    }

    const byId = await prisma[options.delegate].findUnique({ where: { id: normalizedIdentifier } });
    if (byId) {
        return ensureEntitySlugForDocument(options, toClient(options.key, byId));
    }

    const sluglessEntries = await prisma[options.delegate].findMany({ where: { slug: '' } });
    const matchedEntry = toClientList(options.key, sluglessEntries).find(
        (item) => getEntitySlug(item, options) === normalizedIdentifier
    );
    if (!matchedEntry) {
        return null;
    }

    return ensureEntitySlugForDocument(options, matchedEntry);
}

const PROJECT_OPTIONS = {
    key: 'project',
    delegate: 'project',
    nameField: 'name',
    prefix: 'project',
};

const DEPLOYMENT_OPTIONS = {
    key: 'deployment',
    delegate: 'deployment',
    nameField: 'name',
    prefix: 'app',
};

export function getProjectSlug(project) {
    return getEntitySlug(project, PROJECT_OPTIONS);
}

export function getDeploymentSlug(deployment) {
    return getEntitySlug(deployment, DEPLOYMENT_OPTIONS);
}

export async function createUniqueProjectSlug(_model, name, excludeId = null, fallbackId = null) {
    return createUniqueEntitySlug(PROJECT_OPTIONS, name, excludeId, fallbackId);
}

export async function createUniqueDeploymentSlug(_model, name, excludeId = null, fallbackId = null) {
    return createUniqueEntitySlug(DEPLOYMENT_OPTIONS, name, excludeId, fallbackId);
}

export async function backfillMissingProjectSlugs(_model) {
    return backfillMissingEntitySlugs(PROJECT_OPTIONS);
}

export async function backfillMissingDeploymentSlugs(_model) {
    return backfillMissingEntitySlugs(DEPLOYMENT_OPTIONS);
}

export async function resolveProjectByIdentifier(_model, identifier) {
    return resolveEntityByIdentifier(PROJECT_OPTIONS, identifier);
}

export async function resolveDeploymentByIdentifier(_model, identifier) {
    return resolveEntityByIdentifier(DEPLOYMENT_OPTIONS, identifier);
}
