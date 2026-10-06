/**
 * POST /api/github/webhook — GitHub webhook receiver for instant project sync.
 *
 * The `github_project_sync` cron task already keeps linked projects fresh on a
 * schedule; this endpoint makes a push show up on the site within seconds.
 * Point a repository webhook here with content type `application/json` and
 * the secret configured on /admin/github (stored encrypted on Config).
 *
 * Unauthenticated by design — GitHub cannot log in — so every request must
 * carry a valid X-Hub-Signature-256 HMAC. Only repos already linked to a
 * Project are synced: a webhook can refresh a row, never import a new repo.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import { decrypt } from '@/lib/encryption';
import { getGithubToken, syncRepositories } from '@/lib/githubProjectSync';

// Events that can change something a project card shows: last push, stars,
// forks, description/topics/archived, releases.
const SYNC_EVENTS = new Set(['push', 'repository', 'release', 'star', 'fork', 'create', 'delete', 'public']);

function isValidSignature(rawBody, signatureHeader, secret) {
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
    const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`);
    const received = Buffer.from(signatureHeader);
    return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function POST(request) {
    const config = await getSingleton(prisma, 'config', { withSecrets: true });
    const secret = config?.encryptedGithubWebhookSecret ? decrypt(config.encryptedGithubWebhookSecret) : '';
    if (!secret) {
        return NextResponse.json({ success: false, error: 'Webhook secret not configured' }, { status: 503 });
    }

    const rawBody = await request.text();
    if (!isValidSignature(rawBody, request.headers.get('x-hub-signature-256'), secret)) {
        return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
    }

    const event = request.headers.get('x-github-event') || '';
    if (event === 'ping') {
        return NextResponse.json({ success: true, data: { event, message: 'pong' } });
    }
    if (!SYNC_EVENTS.has(event)) {
        return NextResponse.json({ success: true, data: { event, skipped: 'event not relevant' } });
    }

    let payload;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const fullName = payload?.repository?.full_name;
    if (!fullName) {
        return NextResponse.json({ success: true, data: { event, skipped: 'no repository in payload' } });
    }

    // Case-insensitive: GitHub preserves the owner's casing, the stored key may differ.
    const project = await prisma.project.findFirst({
        where: { repoFullName: { equals: fullName, mode: 'insensitive' } },
        select: { repoFullName: true },
    });
    if (!project) {
        return NextResponse.json({ success: true, data: { event, repo: fullName, skipped: 'repository not linked to a project' } });
    }

    // GitHub gives up on a delivery after 10s; reply now and sync afterwards.
    after(async () => {
        const [result] = await syncRepositories([project.repoFullName], { token: await getGithubToken() });
        console.log(`[github-webhook] ${event} → ${project.repoFullName}: ${result?.status}${result?.error ? ` (${result.error})` : ''}`);
    });

    return NextResponse.json({ success: true, data: { event, repo: project.repoFullName, queued: true } }, { status: 202 });
}

export const dynamic = 'force-dynamic';
