/**
 * Google Indexing ping API.
 *
 *   POST /api/admin/seo/index  body: { urls: string[], type?: 'URL_UPDATED'|'URL_DELETED' }
 *
 * Decrypts the stored service account, notifies Google for each URL via
 * lib/googleIndexing.js, and records each outcome in the IndexingLog table.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getSingleton } from '@/lib/serialize';
import { decrypt } from '@/lib/encryption';
import { pingUrls, INDEXING_TYPES } from '@/lib/googleIndexing';

const MAX_URLS = 100;

export async function POST(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json().catch(() => ({}));
        const type = INDEXING_TYPES.includes(body?.type) ? body.type : 'URL_UPDATED';
        const urls = Array.isArray(body?.urls)
            ? body.urls.map((u) => String(u || '').trim()).filter(Boolean).slice(0, MAX_URLS)
            : [];

        if (!urls.length) {
            return NextResponse.json({ success: false, error: 'No URLs provided.' }, { status: 400 });
        }

        const row = await getSingleton(prisma, 'seoConfig', { withSecrets: true });
        const enc = row?.encryptedGoogleServiceAccount;
        if (!enc) {
            return NextResponse.json({ success: false, error: 'No Google service account configured.' }, { status: 400 });
        }
        const serviceAccount = decrypt(enc);
        if (!serviceAccount) {
            return NextResponse.json({ success: false, error: 'Stored service account could not be decrypted.' }, { status: 400 });
        }

        const results = await pingUrls(serviceAccount, urls, type);

        // Persist an audit row per URL.
        await prisma.indexingLog.createMany({
            data: results.map((r) => ({
                url: r.url,
                type,
                status: r.status,
                response: String(r.response || '').slice(0, 2000),
            })),
        });

        const ok = results.filter((r) => r.status === 'success').length;
        return NextResponse.json({ success: true, type, sent: results.length, ok, results });
    } catch (error) {
        console.error('[seo/index] error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
