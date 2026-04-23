
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";
import Config from "@/models/Config";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import cache, { CACHE_KEYS, CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';
import { createUniqueBlogSlug } from '@/lib/blogSlugs';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { getSiteUrl } from '@/lib/siteUrl';

const BLOG_LIST_SELECT = ['title', 'slug', 'content', 'excerpt', 'image', 'imageAlt', 'date', 'createdAt', 'updatedAt', 'published', 'tags', 'seoTitle', 'seoDescription', 'canonicalUrl', 'keywords', 'socialTitle', 'socialDescription', 'socialImage', 'socialImageAlt', 'noIndex'].join(' ');
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

async function validateBearerBlogToken(request) {
    const authHeader = request.headers.get('authorization') || '';
    const [scheme, rawToken] = authHeader.split(' ');
    if (!scheme || !rawToken || scheme.toLowerCase() !== 'bearer') {
        return false;
    }

    const providedHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const config = await Config.findOne().select('+blogApiTokenHash').lean();
    const storedHash = String(config?.blogApiTokenHash || '');
    if (!storedHash) return false;

    const storedBuffer = Buffer.from(storedHash, 'hex');
    const providedBuffer = Buffer.from(providedHash, 'hex');
    if (storedBuffer.length !== providedBuffer.length) return false;

    return crypto.timingSafeEqual(storedBuffer, providedBuffer);
}

function toPublicBlogList(blogs, maxLength = 500) {
    if (!Array.isArray(blogs)) return [];
    return blogs.map((blog) => ({
        ...blog,
        content: typeof blog?.content === 'string' ? blog.content.slice(0, maxLength) : '',
    }));
}

function isDuplicateTitleError(error) {
    return error?.code === 11000 && (error?.keyPattern?.title || error?.keyValue?.title);
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
    const shouldCheckSession = showAll === 'true';
    const session = shouldCheckSession ? await getSession() : null;

    try {
        await dbConnect();

        let query = {};
        // Only show drafts if 'all' param is requested AND user is admin
        if (session && showAll === 'true') {
            query = {};
        } else {
            query = { published: { $ne: false } };
        }

        if (session && showAll === 'true') {
            const blogs = await Blog.find(query).sort({ createdAt: -1 }).lean();
            return NextResponse.json(
                { success: true, data: blogs },
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
                    async () => Blog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).select(BLOG_LIST_SELECT).lean(),
                    CACHE_TTL.MEDIUM
                ),
                cache.getOrSet(
                    totalCacheKey,
                    async () => Blog.countDocuments(query),
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
            async () => Blog.find(query).sort({ createdAt: -1 }).select(BLOG_LIST_SELECT).lean(),
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
    await dbConnect();

    // Security Check
    // 1. Check for API Key (External tools like n8n)
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.BLOG_API_KEY || process.env.JWT_SECRET;

    const isApiKeyValid = apiKey && validApiKey && apiKey === validApiKey;
    const isBearerTokenValid = await validateBearerBlogToken(request);

    // 2. Check for Session (Admin Panel)
    const session = await getSession();
    const isSessionValid = !!session;

    if (!isApiKeyValid && !isSessionValid && !isBearerTokenValid) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const rawBody = await request.json();
        const body = normalizeBlogPayload(rawBody);
        console.log('POST /api/blogs - Body:', body);

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

        const existingTitle = await Blog.findOne({ title: body.title })
            .collation({ locale: 'en', strength: 2 })
            .select('_id')
            .lean();

        if (existingTitle) {
            return NextResponse.json(
                { success: false, error: 'A blog with this title already exists.' },
                { status: 409 }
            );
        }

        // Use provided published status or default to false (Draft)
        const blogData = {
            ...body,
            slug: await createUniqueBlogSlug(Blog, body.title),
            published: body.published !== undefined ? body.published : false,
            isAutomated: !isSessionValid
        };

        const blog = await Blog.create(blogData);
        console.log('POST /api/blogs - Created:', blog);
        await cache.invalidatePrefixAsync('db:blogs');
        await cache.invalidatePrefixAsync('db:blog');
        revalidateBlogPublicPaths(blog?.slug);
        return NextResponse.json({ success: true, data: blog }, { status: 201 });
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
