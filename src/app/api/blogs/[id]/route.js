
import { prisma } from "@/lib/prisma";
import { toClient, fromClient } from "@/lib/serialize";
import { NextResponse } from "next/server";
import cache from '@/lib/cache';
import { createUniqueBlogSlug, resolveBlogByIdentifier } from '@/lib/blogSlugs';
import { revalidatePath } from 'next/cache';
import { getSiteUrl } from '@/lib/siteUrl';
import { autoPing } from '@/lib/autoIndexing';

function normalizeCanonicalUrl(value) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return '';

    const baseUrl = getSiteUrl();

    try {
        const parsed = new URL(raw, baseUrl);
        const base = new URL(baseUrl);
        if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.origin !== base.origin) {
            return '';
        }
        return parsed.toString();
    } catch {
        return '';
    }
}

function normalizeStringList(value) {
    if (Array.isArray(value)) {
        return value.map((entry) => String(entry || '').trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
        return value.split(',').map((entry) => entry.trim()).filter(Boolean);
    }

    return [];
}

function normalizeBlogPayload(body = {}) {
    const hasNoIndex = Object.prototype.hasOwnProperty.call(body, 'noIndex');
    const hasPublished = Object.prototype.hasOwnProperty.call(body, 'published');

    return {
        ...body,
        title: typeof body.title === 'string' ? body.title.trim() : body.title,
        content: typeof body.content === 'string' ? body.content : body.content,
        excerpt: typeof body.excerpt === 'string' ? body.excerpt.trim() : body.excerpt,
        seoTitle: typeof body.seoTitle === 'string' ? body.seoTitle.trim() : body.seoTitle,
        seoDescription: typeof body.seoDescription === 'string' ? body.seoDescription.trim() : body.seoDescription,
        canonicalUrl: body.canonicalUrl !== undefined ? normalizeCanonicalUrl(body.canonicalUrl) : body.canonicalUrl,
        socialTitle: typeof body.socialTitle === 'string' ? body.socialTitle.trim() : body.socialTitle,
        socialDescription: typeof body.socialDescription === 'string' ? body.socialDescription.trim() : body.socialDescription,
        socialImage: typeof body.socialImage === 'string' ? body.socialImage.trim() : body.socialImage,
        socialImageAlt: typeof body.socialImageAlt === 'string' ? body.socialImageAlt.trim() : body.socialImageAlt,
        imageAlt: typeof body.imageAlt === 'string' ? body.imageAlt.trim() : body.imageAlt,
        tags: body.tags !== undefined ? normalizeStringList(body.tags) : body.tags,
        keywords: body.keywords !== undefined ? normalizeStringList(body.keywords) : body.keywords,
        noIndex: hasNoIndex ? body.noIndex === true : body.noIndex,
        published: hasPublished ? body.published === true : body.published,
    };
}

function isDuplicateTitleError(error) {
    // Prisma unique-constraint violation on the case-insensitive title index.
    return error?.code === 'P2002';
}

function revalidateBlogPublicPaths(slug = '') {
    revalidatePath('/');
    revalidatePath('/blogs');
    revalidatePath('/sitemap.xml');
    if (slug) {
        revalidatePath(`/blogs/${slug}`);
    }
}

export async function GET(request, { params }) {
    const { id } = await params;
    try {
        const blog = await resolveBlogByIdentifier(null, id);
        if (!blog) {
            return NextResponse.json({ success: false, error: "Blog not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: blog });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function PUT(request, { params }) {
    const { id } = await params;
    try {
        const rawBody = await request.json();
        const body = normalizeBlogPayload(rawBody);

        const existingBlog = await prisma.blog.findUnique({ where: { id }, select: { id: true, title: true, slug: true } });
        if (!existingBlog) {
            return NextResponse.json({ success: false, error: "Blog not found" }, { status: 404 });
        }

        const nextTitle = typeof body?.title === 'string' && body.title.trim() ? body.title : existingBlog.title;
        const duplicateTitle = await prisma.blog.findFirst({
            where: { id: { not: id }, title: { equals: nextTitle, mode: 'insensitive' } },
            select: { id: true },
        });

        if (duplicateTitle) {
            return NextResponse.json(
                { success: false, error: 'A blog with this title already exists.' },
                { status: 409 }
            );
        }

        const nextSlug = body?.title || !existingBlog.slug
            ? await createUniqueBlogSlug(null, nextTitle, existingBlog.id, existingBlog.id)
            : existingBlog.slug;

        const blog = await prisma.blog.update({
            where: { id },
            data: fromClient('blog', { ...body, slug: nextSlug }, { keepId: false }),
        });

        await cache.invalidatePrefixAsync('db:blogs');
        await cache.invalidatePrefixAsync('db:blog');
        revalidateBlogPublicPaths(existingBlog?.slug);
        revalidateBlogPublicPaths(blog?.slug);
        if (blog?.slug) {
            const isIndexable = blog.published && !blog.noIndex;
            autoPing([`/blogs/${blog.slug}`, '/blogs'], isIndexable ? 'URL_UPDATED' : 'URL_DELETED');
            if (existingBlog?.slug && existingBlog.slug !== blog.slug) {
                autoPing([`/blogs/${existingBlog.slug}`], 'URL_DELETED');
            }
        }
        return NextResponse.json({ success: true, data: toClient('blog', blog) });
    } catch (error) {
        if (isDuplicateTitleError(error)) {
            return NextResponse.json(
                { success: false, error: 'A blog with this title already exists.' },
                { status: 409 }
            );
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE(request, { params }) {
    const { id } = await params;
    try {
        let blog;
        try {
            blog = await prisma.blog.delete({ where: { id } });
        } catch (error) {
            if (error?.code === 'P2025') {
                return NextResponse.json({ success: false, error: "Blog not found" }, { status: 404 });
            }
            throw error;
        }
        await cache.invalidatePrefixAsync('db:blogs');
        await cache.invalidatePrefixAsync('db:blog');
        revalidateBlogPublicPaths(blog?.slug);
        if (blog?.slug) {
            autoPing([`/blogs/${blog.slug}`], 'URL_DELETED');
            autoPing(['/blogs']);
        }
        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
