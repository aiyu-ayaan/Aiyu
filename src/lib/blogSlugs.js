import { prisma } from '@/lib/prisma';
import { toClient, toClientList } from '@/lib/serialize';
import { generateSlug } from '@/lib/seoHelper';

// NOTE: The leading `_model` parameter is retained for backward compatibility
// with existing call sites (which used to pass the Mongoose model). It is
// ignored — all lookups go through the shared Prisma client.

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

export async function createUniqueBlogSlug(_model, title, excludeId = null, fallbackId = null) {
    const baseSlug = getFallbackSlugBase(title, fallbackId);
    let candidate = baseSlug;
    let suffix = 2;

    while (true) {
        const existing = await prisma.blog.findFirst({
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

export async function ensureBlogSlugForDocument(_model, blog) {
    if (!blog?._id) {
        return blog;
    }

    const storedSlug = typeof blog?.slug === 'string' ? blog.slug.trim() : '';
    if (storedSlug) {
        return blog;
    }

    const slug = await createUniqueBlogSlug(null, blog.title, blog._id, blog._id);

    await prisma.blog.updateMany({
        where: { id: blog._id, slug: '' },
        data: { slug },
    });

    return {
        ...blog,
        slug,
    };
}

export async function backfillMissingBlogSlugs(_model) {
    const missingBlogs = await prisma.blog.findMany({
        where: { slug: '' },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, title: true, slug: true },
    });

    if (missingBlogs.length === 0) {
        return;
    }

    const existingSlugRows = await prisma.blog.findMany({
        where: { NOT: { slug: '' } },
        select: { slug: true },
    });

    const usedSlugs = new Set(
        existingSlugRows
            .map((entry) => (typeof entry?.slug === 'string' ? entry.slug.trim() : ''))
            .filter(Boolean)
    );

    for (const blog of missingBlogs) {
        const baseSlug = getFallbackSlugBase(blog.title, blog.id);
        let slug = baseSlug;
        let suffix = 2;

        while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }

        usedSlugs.add(slug);
        await prisma.blog.update({ where: { id: blog.id }, data: { slug } });
    }
}

export async function resolveBlogByIdentifier(_model, identifier) {
    const normalizedIdentifier = String(identifier || '').trim();
    if (!normalizedIdentifier) {
        return null;
    }

    // 1. Exact slug match
    const bySlug = await prisma.blog.findFirst({ where: { slug: normalizedIdentifier } });
    if (bySlug) {
        return toClient('blog', bySlug);
    }

    // 2. Case-insensitive slug match
    const bySlugInsensitive = await prisma.blog.findFirst({
        where: { slug: { equals: normalizedIdentifier, mode: 'insensitive' } }
    });
    if (bySlugInsensitive) {
        return toClient('blog', bySlugInsensitive);
    }

    // 3. ID match
    const byId = await prisma.blog.findUnique({ where: { id: normalizedIdentifier } });
    if (byId) {
        return ensureBlogSlugForDocument(null, toClient('blog', byId));
    }

    // 4. Robust fallback: match by derived slug or title slugification across all rows
    const allBlogs = await prisma.blog.findMany();
    const clientBlogs = toClientList('blog', allBlogs);
    const matchedBlog = clientBlogs.find(
        (entry) =>
            getBlogSlug(entry) === normalizedIdentifier ||
            entry.slug === normalizedIdentifier ||
            entry._id === normalizedIdentifier ||
            generateSlug(entry.title) === normalizedIdentifier ||
            (entry.slug && normalizedIdentifier.startsWith(entry.slug)) ||
            (entry.slug && entry.slug.startsWith(normalizedIdentifier))
    );

    if (!matchedBlog) {
        return null;
    }

    return ensureBlogSlugForDocument(null, matchedBlog);
}
