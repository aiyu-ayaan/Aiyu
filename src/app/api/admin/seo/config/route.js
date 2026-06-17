/**
 * SEO config API — robots/sitemap overrides + Google service-account secret.
 *
 *   GET /api/admin/seo/config -> merged config + service-account status + logs
 *   PUT /api/admin/seo/config -> persist robots/sitemap/indexing + (set/clear) key
 *
 * The Google service-account JSON is validated, then stored encrypted in the
 * dedicated SeoConfig column (withheld by the serializer). It is never returned
 * to the client — only `hasServiceAccount` and the parsed client_email.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getSingleton, upsertSingleton, toClientList } from '@/lib/serialize';
import { encrypt, decrypt } from '@/lib/encryption';
import { getSeoConfig, invalidateSeoConfig } from '@/lib/seoConfig';
import { parseServiceAccount } from '@/lib/googleIndexing';

async function serviceAccountStatus() {
    const row = await getSingleton(prisma, 'seoConfig', { withSecrets: true });
    const enc = row?.encryptedGoogleServiceAccount;
    if (!enc) return { hasServiceAccount: false, email: '' };
    try {
        const sa = parseServiceAccount(decrypt(enc));
        return { hasServiceAccount: true, email: sa.client_email };
    } catch {
        return { hasServiceAccount: true, email: '', invalid: true };
    }
}

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const [config, status, logRows] = await Promise.all([
            getSeoConfig(),
            serviceAccountStatus(),
            prisma.indexingLog.findMany({ orderBy: { createdAt: 'desc' }, take: 25 }),
        ]);
        return NextResponse.json({
            success: true,
            config,
            serviceAccount: status,
            logs: toClientList('indexingLog', logRows),
        });
    } catch (error) {
        console.error('[seo/config] GET error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        const patch = {};

        if (body.robots !== undefined) patch.robots = body.robots;
        if (body.sitemap !== undefined) patch.sitemap = body.sitemap;
        if (body.indexing !== undefined) patch.indexing = body.indexing;

        // serviceAccount: a JSON string to set, '' to clear, undefined to leave.
        if (body.serviceAccount !== undefined) {
            if (body.serviceAccount === '' || body.serviceAccount === null) {
                patch.encryptedGoogleServiceAccount = null;
            } else {
                // Validate before storing so a bad key is rejected up front.
                parseServiceAccount(body.serviceAccount);
                const raw = typeof body.serviceAccount === 'string'
                    ? body.serviceAccount
                    : JSON.stringify(body.serviceAccount);
                patch.encryptedGoogleServiceAccount = encrypt(raw);
            }
        }

        await upsertSingleton(prisma, 'seoConfig', patch);
        await invalidateSeoConfig();

        const [config, status] = await Promise.all([getSeoConfig(), serviceAccountStatus()]);
        return NextResponse.json({ success: true, config, serviceAccount: status });
    } catch (error) {
        console.error('[seo/config] PUT error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
