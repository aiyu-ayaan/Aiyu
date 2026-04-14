import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import cache, { CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');


    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
    }

    try {
        const normalizedUrl = url.trim();
        const hash = createHash('sha1').update(normalizedUrl).digest('hex');
        const cacheKey = `og:${hash}`;

        const { value, meta } = await cache.getOrSetWithMeta(
            cacheKey,
            async () => {
                const response = await fetch(normalizedUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
                    },
                });

                if (!response.ok) {
                    return {
                        error: true,
                        status: response.status,
                    };
                }

                const html = await response.text();

                const getMetaTag = (property) => {
                    const regex = new RegExp(`<meta property="${property}" content="([^"]*)"`, 'i');
                    const match = html.match(regex);
                    return match ? match[1] : null;
                };

                const getMetaName = (name) => {
                    const regex = new RegExp(`<meta name="${name}" content="([^"]*)"`, 'i');
                    const match = html.match(regex);
                    return match ? match[1] : null;
                };

                const title = getMetaTag('og:title') || html.match(/<title>([^<]*)<\/title>/i)?.[1] || '';
                const description = getMetaTag('og:description') || getMetaName('description') || '';
                const image = getMetaTag('og:image') || '';
                const siteName = getMetaTag('og:site_name') || '';

                return { title, description, image, siteName, url: normalizedUrl };
            },
            CACHE_TTL.LONG
        );

        if (value?.error) {
            return NextResponse.json(
                { error: 'Failed to fetch URL' },
                { status: value.status || 500, headers: createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_SHORT) }
            );
        }

        return NextResponse.json(value, {
            headers: {
                ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_LONG),
                ...createCacheDebugHeaders(meta),
            },
        });
    } catch (error) {
        console.error('OG Preview Error:', error);
        return NextResponse.json({ error: 'Failed to parse URL' }, { status: 500 });
    }
}
