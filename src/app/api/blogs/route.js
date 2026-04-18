
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";
import Config from "@/models/Config";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import cache, { CACHE_KEYS, CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';
import { createUniqueBlogSlug } from '@/lib/blogSlugs';
import crypto from 'crypto';

const BLOG_LIST_SELECT = ['title', 'slug', 'content', 'excerpt', 'image', 'imageAlt', 'date', 'createdAt', 'updatedAt', 'published', 'tags', 'seoTitle', 'seoDescription', 'canonicalUrl', 'keywords', 'socialTitle', 'socialDescription', 'socialImage', 'socialImageAlt', 'noIndex'].join(' ');

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
        canonicalUrl: String(body.canonicalUrl || '').trim(),
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

export async function GET(request) {
    const startedAt = Date.now();
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('all');
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

        // Use provided published status or default to false (Draft)
        const blogData = {
            ...body,
            slug: await createUniqueBlogSlug(Blog, body.title),
            published: body.published !== undefined ? body.published : false
        };

        const blog = await Blog.create(blogData);
        console.log('POST /api/blogs - Created:', blog);
        await cache.invalidatePrefixAsync('db:blogs');
        await cache.invalidatePrefixAsync('db:blog');
        return NextResponse.json({ success: true, data: blog }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
