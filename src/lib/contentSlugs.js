import mongoose from 'mongoose';
import { generateSlug } from '@/lib/seoHelper';

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

async function createUniqueEntitySlug(Model, name, options, excludeId = null, fallbackId = null) {
    const baseSlug = getFallbackSlugBase(name, fallbackId, options.prefix);
    let candidate = baseSlug;
    let suffix = 2;

    while (true) {
        const existing = await Model.findOne({
            slug: candidate,
            ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        })
            .select('_id')
            .lean();

        if (!existing) {
            return candidate;
        }

        candidate = `${baseSlug}-${suffix}`;
        suffix += 1;
    }
}

async function ensureEntitySlugForDocument(Model, entry, options) {
    if (!entry?._id) {
        return entry;
    }

    const storedSlug = getStoredSlug(entry);
    if (storedSlug) {
        return entry;
    }

    const slug = await createUniqueEntitySlug(Model, entry?.[options.nameField], options, entry._id, entry._id);

    await Model.updateOne(
        { _id: entry._id, $or: [{ slug: { $exists: false } }, { slug: '' }, { slug: null }] },
        { $set: { slug } }
    );

    return {
        ...entry,
        slug,
    };
}

async function backfillMissingEntitySlugs(Model, options) {
    const missingEntries = await Model.find({
        $or: [{ slug: { $exists: false } }, { slug: '' }, { slug: null }],
    })
        .sort({ createdAt: 1, _id: 1 })
        .select(`_id ${options.nameField} slug`)
        .lean();

    if (missingEntries.length === 0) {
        return;
    }

    const existingSlugDocs = await Model.find({
        slug: { $exists: true, $nin: ['', null] },
    })
        .select('slug')
        .lean();

    const usedSlugs = new Set(
        existingSlugDocs
            .map((entry) => getStoredSlug(entry))
            .filter(Boolean)
    );

    const operations = missingEntries.map((entry) => {
        const baseSlug = getFallbackSlugBase(entry?.[options.nameField], entry?._id, options.prefix);
        let slug = baseSlug;
        let suffix = 2;

        while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }

        usedSlugs.add(slug);

        return {
            updateOne: {
                filter: { _id: entry._id },
                update: { $set: { slug } },
            },
        };
    });

    if (operations.length > 0) {
        await Model.bulkWrite(operations, { ordered: true });
    }
}

async function resolveEntityByIdentifier(Model, identifier, options) {
    const normalizedIdentifier = String(identifier || '').trim();
    if (!normalizedIdentifier) {
        return null;
    }

    let entry = await Model.findOne({ slug: normalizedIdentifier }).lean();
    if (entry) {
        return entry;
    }

    if (mongoose.Types.ObjectId.isValid(normalizedIdentifier)) {
        entry = await Model.findById(normalizedIdentifier).lean();
        if (entry) {
            return ensureEntitySlugForDocument(Model, entry, options);
        }
    }

    const sluglessEntries = await Model.find({
        $or: [{ slug: { $exists: false } }, { slug: '' }, { slug: null }],
    }).lean();

    const matchedEntry = sluglessEntries.find((item) => getEntitySlug(item, options) === normalizedIdentifier);
    if (!matchedEntry) {
        return null;
    }

    return ensureEntitySlugForDocument(Model, matchedEntry, options);
}

const PROJECT_OPTIONS = {
    nameField: 'name',
    prefix: 'project',
};

const DEPLOYMENT_OPTIONS = {
    nameField: 'name',
    prefix: 'app',
};

export function getProjectSlug(project) {
    return getEntitySlug(project, PROJECT_OPTIONS);
}

export function getDeploymentSlug(deployment) {
    return getEntitySlug(deployment, DEPLOYMENT_OPTIONS);
}

export async function createUniqueProjectSlug(ProjectModel, name, excludeId = null, fallbackId = null) {
    return createUniqueEntitySlug(ProjectModel, name, PROJECT_OPTIONS, excludeId, fallbackId);
}

export async function createUniqueDeploymentSlug(DeploymentModel, name, excludeId = null, fallbackId = null) {
    return createUniqueEntitySlug(DeploymentModel, name, DEPLOYMENT_OPTIONS, excludeId, fallbackId);
}

export async function backfillMissingProjectSlugs(ProjectModel) {
    return backfillMissingEntitySlugs(ProjectModel, PROJECT_OPTIONS);
}

export async function backfillMissingDeploymentSlugs(DeploymentModel) {
    return backfillMissingEntitySlugs(DeploymentModel, DEPLOYMENT_OPTIONS);
}

export async function resolveProjectByIdentifier(ProjectModel, identifier) {
    return resolveEntityByIdentifier(ProjectModel, identifier, PROJECT_OPTIONS);
}

export async function resolveDeploymentByIdentifier(DeploymentModel, identifier) {
    return resolveEntityByIdentifier(DeploymentModel, identifier, DEPLOYMENT_OPTIONS);
}
