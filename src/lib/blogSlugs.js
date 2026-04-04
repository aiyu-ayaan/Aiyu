import mongoose from 'mongoose';
import { generateSlug } from '@/lib/seoHelper';

function getFallbackSlugBase(title, id) {
    const generated = generateSlug(title);
    if (generated) {
        return generated;
    }

    const safeId = typeof id === 'string' ? id : String(id || '');
    const suffix = safeId.slice(-6) || 'entry';
    return `blog-${suffix}`;
}

export function getBlogSlug(blog) {
    const storedSlug = typeof blog?.slug === 'string' ? blog.slug.trim() : '';
    if (storedSlug) {
        return storedSlug;
    }

    return getFallbackSlugBase(blog?.title, blog?._id);
}

export async function createUniqueBlogSlug(BlogModel, title, excludeId = null, fallbackId = null) {
    const baseSlug = getFallbackSlugBase(title, fallbackId);
    let candidate = baseSlug;
    let suffix = 2;

    while (true) {
        const existing = await BlogModel.findOne({
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

export async function ensureBlogSlugForDocument(BlogModel, blog) {
    if (!blog?._id) {
        return blog;
    }

    const storedSlug = typeof blog?.slug === 'string' ? blog.slug.trim() : '';
    if (storedSlug) {
        return blog;
    }

    const slug = await createUniqueBlogSlug(BlogModel, blog.title, blog._id, blog._id);

    await BlogModel.updateOne(
        { _id: blog._id, $or: [{ slug: { $exists: false } }, { slug: '' }, { slug: null }] },
        { $set: { slug } }
    );

    return {
        ...blog,
        slug,
    };
}

export async function backfillMissingBlogSlugs(BlogModel) {
    const missingBlogs = await BlogModel.find({
        $or: [{ slug: { $exists: false } }, { slug: '' }, { slug: null }],
    })
        .sort({ createdAt: 1, _id: 1 })
        .select('_id title slug')
        .lean();

    if (missingBlogs.length === 0) {
        return;
    }

    const existingSlugDocs = await BlogModel.find({
        slug: { $exists: true, $nin: ['', null] },
    })
        .select('slug')
        .lean();

    const usedSlugs = new Set(
        existingSlugDocs
            .map((entry) => (typeof entry?.slug === 'string' ? entry.slug.trim() : ''))
            .filter(Boolean)
    );

    const operations = missingBlogs.map((blog) => {
        const baseSlug = getFallbackSlugBase(blog.title, blog._id);
        let slug = baseSlug;
        let suffix = 2;

        while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }

        usedSlugs.add(slug);

        return {
            updateOne: {
                filter: { _id: blog._id },
                update: { $set: { slug } },
            },
        };
    });

    if (operations.length > 0) {
        await BlogModel.bulkWrite(operations, { ordered: true });
    }
}

export async function resolveBlogByIdentifier(BlogModel, identifier) {
    const normalizedIdentifier = String(identifier || '').trim();
    if (!normalizedIdentifier) {
        return null;
    }

    let blog = await BlogModel.findOne({ slug: normalizedIdentifier }).lean();
    if (blog) {
        return blog;
    }

    if (mongoose.Types.ObjectId.isValid(normalizedIdentifier)) {
        blog = await BlogModel.findById(normalizedIdentifier).lean();
        if (blog) {
            return ensureBlogSlugForDocument(BlogModel, blog);
        }
    }

    const sluglessBlogs = await BlogModel.find({
        $or: [{ slug: { $exists: false } }, { slug: '' }, { slug: null }],
    }).lean();

    const matchedBlog = sluglessBlogs.find((entry) => getBlogSlug(entry) === normalizedIdentifier);
    if (!matchedBlog) {
        return null;
    }

    return ensureBlogSlugForDocument(BlogModel, matchedBlog);
}
