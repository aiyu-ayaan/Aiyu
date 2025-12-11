import { NextResponse } from 'next/server';

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
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch URL' }, { status: response.status });
        }

        const html = await response.text();

        // Simple regex to extract OG tags and title/description
        const getMetaTag = (property) => {
            const regex = new RegExp(`<meta property="${property}" content="([^"]*)"`, 'i');
            const match = html.match(regex);
            return match ? match[1] : null;
        };

        // Also try name attribute for description if property not found
        const getMetaName = (name) => {
            const regex = new RegExp(`<meta name="${name}" content="([^"]*)"`, 'i');
            const match = html.match(regex);
            return match ? match[1] : null;

        }

        const title = getMetaTag('og:title') || html.match(/<title>([^<]*)<\/title>/i)?.[1] || '';
        const description = getMetaTag('og:description') || getMetaName('description') || '';
        const image = getMetaTag('og:image') || '';
        const siteName = getMetaTag('og:site_name') || '';

        return NextResponse.json({
            title,
            description,
            image,
            siteName,
            url
        });
    } catch (error) {
        console.error('OG Preview Error:', error);
        return NextResponse.json({ error: 'Failed to parse URL' }, { status: 500 });
    }
}
