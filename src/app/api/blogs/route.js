import { prisma } from "@/lib/prisma";
import { toClient, toClientList, fromClient, getSingleton } from "@/lib/serialize";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import cache, { CACHE_KEYS, CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';
import { createUniqueBlogSlug } from '@/lib/blogSlugs';
import { validateBearerBlogToken } from '@/lib/blogApiAuth';
import { revalidatePath } from 'next/cache';
import { getSiteUrl } from '@/lib/siteUrl';
import { autoPing } from '@/lib/autoIndexing';
import { evaluateBlogForReview } from '@/lib/blogReviewEngine';

const DEFAULT_BLOG_PAGE_SIZE = 6;
const MAX_BLOG_PAGE_SIZE = 24;

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
    return {
        ...body,
        title: String(body.title || '').trim(),
        content: String(body.content || ''),
        excerpt: String(body.excerpt || '').trim(),
        seoTitle: String(body.seoTitle || '').trim(),
        seoDescription: String(body.seoDescription || '').trim(),
        canonicalUrl: normalizeCanonicalUrl(body.canonicalUrl),
        socialTitle: String(body.socialTitle || '').trim(),
        socialDescription: String(body.socialDescription || '').trim(),
        socialImage: String(body.socialImage || '').trim(),
        socialImageAlt: String(body.socialImageAlt || '').trim(),
        imageAlt: String(body.imageAlt || '').trim(),
        tags: normalizeStringList(body.tags),
        keywords: normalizeStringList(body.keywords),
        noIndex: body.noIndex === true,
        published: body.published === true,
    };
}

function toPublicBlogList(blogs, maxLength = undefined) {
    if (!Array.isArray(blogs)) return [];
    return blogs.map((blog) => ({
        ...blog,
        content: typeof blog?.content === 'string' && maxLength ? blog.content.slice(0, maxLength) : (blog?.content || ''),
    }));
}

function isDuplicateTitleError(error) {
    // Prisma unique-constraint violation on the case-insensitive title index.
    return error?.code === 'P2002';
}

function parsePagination(searchParams) {
    const rawPage = searchParams.get('page');
    const rawLimit = searchParams.get('limit');
    const hasPagination = rawPage !== null || rawLimit !== null;

    if (!hasPagination) {
        return { hasPagination: false, page: 1, limit: DEFAULT_BLOG_PAGE_SIZE };
    }

    const parsedPage = Number.parseInt(rawPage || '1', 10);
    const parsedLimit = Number.parseInt(rawLimit || String(DEFAULT_BLOG_PAGE_SIZE), 10);
    const page = Number.isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);
    const limit = Number.isNaN(parsedLimit) ? DEFAULT_BLOG_PAGE_SIZE : Math.max(1, Math.min(MAX_BLOG_PAGE_SIZE, parsedLimit));

    return { hasPagination: true, page, limit };
}

function revalidateBlogPublicPaths(slug = '') {
    revalidatePath('/');
    revalidatePath('/blogs');
    revalidatePath('/sitemap.xml');
    if (slug) {
        revalidatePath(`/blogs/${slug}`);
    }
}

export async function GET(request) {
    const startedAt = Date.now();
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('all');
    const { hasPagination, page, limit } = parsePagination(searchParams);
    const adminLimit = Math.max(1, Math.min(MAX_BLOG_PAGE_SIZE, Number.parseInt(searchParams.get('limit') || '20', 10) || 20));
    const adminPage = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const filterTab = searchParams.get('filter') || 'all';
    const shouldCheckSession = showAll === 'true';
    const session = shouldCheckSession ? await getSession() : null;

    try {
        // Only show drafts if 'all' param is requested AND user is admin.
        const isAdminAll = session && showAll === 'true';
        const where = isAdminAll ? {} : { published: true };

        if (isAdminAll) {
            const adminWhere =
                filterTab === 'flagged' ? { isFlagged: true }
                : filterTab === 'ceased' ? { published: false, isFlagged: false }
                : filterTab === 'active' ? { published: true, isFlagged: false }
                : {};

            const [totalBlogs, totalFlagged, totalCeased, totalActive, blogsRaw] = await Promise.all([
                prisma.blog.count(),
                prisma.blog.count({ where: { isFlagged: true } }),
                prisma.blog.count({ where: { published: false, isFlagged: false } }),
                prisma.blog.count({ where: { published: true, isFlagged: false } }),
                prisma.blog.findMany({
                    where: adminWhere,
                    orderBy: { createdAt: 'desc' },
                    skip: (adminPage - 1) * adminLimit,
                    take: adminLimit,
                }),
            ]);

            const blogs = toClientList('blog', blogsRaw);

            // Get views count for each blog from the AnalyticsDaily rollup
            const viewsRollup = await prisma.analyticsDaily.groupBy({
                by: ['entityId'],
                where: {
                    type: 'entity_view',
                    entityType: 'blog',
                    entityId: { in: blogs.map(b => b._id) }
                },
                _sum: {
                    views: true
                }
            });

            const viewsMap = {};
            viewsRollup.forEach(row => {
                if (row.entityId) {
                    viewsMap[row.entityId] = row._sum.views || 0;
                }
            });

            const blogsWithViews = blogs.map(blog => ({
                ...blog,
                views: viewsMap[blog._id] || 0
            }));

            const filteredTotal =
                filterTab === 'flagged' ? totalFlagged
                : filterTab === 'ceased' ? totalCeased
                : filterTab === 'active' ? totalActive
                : totalBlogs;
            const totalPages = filteredTotal > 0 ? Math.ceil(filteredTotal / adminLimit) : 0;

            return NextResponse.json(
                {
                    success: true,
                    data: blogsWithViews,
                    pagination: {
                        page: adminPage,
                        limit: adminLimit,
                        total: filteredTotal,
                        totalPages,
                        hasMore: adminPage < totalPages,
                    },
                    counts: {
                        all: totalBlogs,
                        flagged: totalFlagged,
                        ceased: totalCeased,
                        active: totalActive,
                    },
                },
                {
                    headers: {
                        'x-response-time-ms': String(Date.now() - startedAt),
                    },
                }
            );
        }

        if (hasPagination) {
            const skip = (page - 1) * limit;
            const blogsCacheKey = `${CACHE_KEYS.BLOGS_PUBLISHED}:page:${page}:limit:${limit}`;
            const totalCacheKey = `${CACHE_KEYS.BLOGS_PUBLISHED}:count`;

            const [{ value: blogs, meta }, total] = await Promise.all([
                cache.getOrSetWithMeta(
                    blogsCacheKey,
                    async () => toClientList('blog', await prisma.blog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit })),
                    CACHE_TTL.MEDIUM
                ),
                cache.getOrSet(
                    totalCacheKey,
                    async () => prisma.blog.count({ where }),
                    CACHE_TTL.MEDIUM
                ),
            ]);

            const normalizedTotal = Number.isFinite(total) ? total : 0;
            const totalPages = normalizedTotal > 0 ? Math.ceil(normalizedTotal / limit) : 0;

            return NextResponse.json(
                {
                    success: true,
                    data: toPublicBlogList(blogs),
                    pagination: {
                        page,
                        limit,
                        total: normalizedTotal,
                        totalPages,
                        hasMore: page < totalPages,
                    },
                },
                {
                    headers: {
                        ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM),
                        ...createCacheDebugHeaders(meta),
                        'x-response-time-ms': String(Date.now() - startedAt),
                    },
                }
            );
        }

        const { value: blogs, meta } = await cache.getOrSetWithMeta(
            CACHE_KEYS.BLOGS_PUBLISHED,
            async () => toClientList('blog', await prisma.blog.findMany({ where, orderBy: { createdAt: 'desc' } })),
            CACHE_TTL.MEDIUM
        );

        return NextResponse.json(
            { success: true, data: toPublicBlogList(blogs) },
            {
                headers: {
                    ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM),
                    ...createCacheDebugHeaders(meta),
                    'x-response-time-ms': String(Date.now() - startedAt),
                },
            }
        );
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            {
                status: 400,
                headers: {
                    'x-response-time-ms': String(Date.now() - startedAt),
                },
            }
        );
    }
}



export async function POST(request) {
    // Security Check
    // 1. Check for Bearer token (external tools like n8n)
    const isBearerTokenValid = await validateBearerBlogToken(request);

    // 2. Check for Session (Admin Panel)
    const session = await getSession();
    const isSessionValid = !!session;

    if (!isSessionValid && !isBearerTokenValid) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const rawBody = await request.json();
        const body = normalizeBlogPayload(rawBody);

        // Default date to now if not provided
        if (!body.date) {
            const now = new Date();
            body.date = now.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        // Validate basic fields
        if (!body.title || !body.content) {
            return NextResponse.json({ success: false, error: 'Title and content are required' }, { status: 400 });
        }

        const existingTitle = await prisma.blog.findFirst({
            where: { title: { equals: body.title, mode: 'insensitive' } },
            select: { id: true },
        });

        if (existingTitle) {
            return NextResponse.json(
                { success: false, error: 'A blog with this title already exists.' },
                { status: 409 }
            );
        }

        // Fetch site configuration for review engine settings
        const config = await getSingleton(prisma, 'config') || {};
        const reviewResult = evaluateBlogForReview(body, config);

        // Use provided published status or default to false (Draft)
        // If flagged by review engine, force published: false (CEASE status) and populate flag metadata
        const initialPublished = body.published !== undefined ? body.published : false;
        const finalPublished = reviewResult.isFlagged ? false : initialPublished;

        const blogData = {
            ...body,
            slug: await createUniqueBlogSlug(null, body.title),
            published: finalPublished,
            isAutomated: !isSessionValid,
            isFlagged: reviewResult.isFlagged,
            flagReason: reviewResult.flagReason,
            reviewStatus: reviewResult.reviewStatus,
        };

        const blog = await prisma.blog.create({ data: fromClient('blog', blogData, { keepId: false }) });
        await cache.invalidatePrefixAsync('db:blogs');
        await cache.invalidatePrefixAsync('db:blog');
        revalidateBlogPublicPaths(blog?.slug);
        if (blog?.published && !blog?.noIndex && blog?.slug) {
            autoPing([`/blogs/${blog.slug}`, '/blogs']);
        }
        return NextResponse.json({ success: true, data: toClient('blog', blog) }, { status: 201 });
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
