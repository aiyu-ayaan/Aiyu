/**
 * Live crawl audit API.
 *
 *   POST /api/admin/seo/crawl -> { success, base, summary, results }
 *
 * Fetches the live sitemap.xml and crawls each URL as Googlebot using the shared
 * lib/seoCrawl.js logic (also used by scripts/seo-audit.mjs). Bounded by a URL
 * limit so it can't exhaust crawl budget or the request timeout.
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSiteUrl } from '@/lib/siteUrl';
import { crawlSitemap } from '@/lib/seoCrawl';

const MAX_URLS = 200;

export async function POST(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        let limit = MAX_URLS;
        try {
            const body = await request.json();
            if (Number.isFinite(body?.limit)) limit = Math.min(Math.max(1, body.limit), MAX_URLS);
        } catch {
            // No/invalid body — use default limit.
        }

        const base = getSiteUrl();
        const { results, summary } = await crawlSitemap(base, { limit });

        return NextResponse.json({ success: true, base, summary, results });
    } catch (error) {
        console.error('[seo/crawl] error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
