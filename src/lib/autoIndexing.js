/**
 * Auto-indexing — Google Indexing API pings triggered by content mutations.
 *
 * Route handlers call `autoPing(paths, type)` after a blog/project/app/header
 * change. The work runs post-response via next/server `after()` so a slow or
 * failing Google call never delays or breaks the mutation. Pings only fire
 * when the admin has enabled `indexing.autoPing` in the SEO config AND a
 * Google service account is stored; every outcome lands in IndexingLog just
 * like manual pings from /admin/seo.
 */
import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import { decrypt } from '@/lib/encryption';
import { pingUrls } from '@/lib/googleIndexing';
import { getSeoConfig } from '@/lib/seoConfig';
import { toCanonicalSiteUrl } from '@/lib/siteUrl';

/**
 * Section landing pages re-pinged when sitewide chrome (e.g. the header nav)
 * changes. Mirrors the static routes in app/sitemap.js.
 */
export const SECTION_PATHS = ['/', '/about-me', '/projects', '/apps', '/blogs', '/gallery', '/github', '/contact-us'];

/** Canonicalize + dedupe a list of paths/URLs into absolute site URLs. */
export function toCanonicalUrls(paths = []) {
    const seen = new Set();
    const out = [];
    for (const path of paths) {
        const value = String(path || '').trim();
        if (!value) continue;
        const url = toCanonicalSiteUrl(value.startsWith('http') ? new URL(value).pathname : value);
        if (seen.has(url)) continue;
        seen.add(url);
        out.push(url);
    }
    return out;
}

async function runAutoPing(paths, type) {
    const { indexing } = await getSeoConfig();
    if (!indexing?.autoPing) return;

    const row = await getSingleton(prisma, 'seoConfig', { withSecrets: true });
    const serviceAccount = row?.encryptedGoogleServiceAccount ? decrypt(row.encryptedGoogleServiceAccount) : null;
    if (!serviceAccount) return;

    const urls = toCanonicalUrls(paths);
    if (!urls.length) return;

    const results = await pingUrls(serviceAccount, urls, type);
    await prisma.indexingLog.createMany({
        data: results.map((r) => ({
            url: r.url,
            type,
            status: r.status,
            response: `[auto] ${String(r.response || '')}`.slice(0, 2000),
        })),
    });
}

/**
 * Queue an indexing ping for after the response is sent. Never throws — must
 * only be called from a request scope (route handler / server action).
 */
export function autoPing(paths, type = 'URL_UPDATED') {
    try {
        after(async () => {
            try {
                await runAutoPing(paths, type);
            } catch (error) {
                console.warn('[autoIndexing] ping failed:', error.message);
            }
        });
    } catch (error) {
        // after() throws outside a request scope; auto-ping is best-effort.
        console.warn('[autoIndexing] could not schedule ping:', error.message);
    }
}
