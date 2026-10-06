/**
 * POST /api/github/sync — pull selected repositories into Project rows.
 *
 * This is the admin's import path: it picks repos and presses sync. Rows it
 * creates are then kept fresh automatically by the `github_project_sync` cron
 * task and the push webhook (/api/github/webhook); none of the three fetch on
 * render, so GitHub's rate limit is never spent on visitor traffic.
 *
 * GET returns a dry-run preview (what each repo would change, and which fields
 * are pinned) so a sync is never a blind write.
 *
 * Sync policy — which fields may be written and how pinning protects manual
 * edits — lives in lib/githubProjects.js; persistence, cache invalidation and
 * search-index pings live in lib/githubProjectSync.js. This route owns
 * authorization and request validation.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import { withAuth } from '@/middleware/auth';
import {
    diffSyncedProject,
    fetchReadme,
    fetchRepo,
    mapRepoToProject,
    seedImageFromReadme,
} from '@/lib/githubProjects';
import { getGithubToken, syncRepositories } from '@/lib/githubProjectSync';

// One press should not be able to start an unbounded fan-out of upstream calls.
const MAX_REPOS_PER_SYNC = 30;

/**
 * Resolve the caller's repo list to "owner/repo" form against the configured
 * account. Bare names are qualified with the configured username; anything
 * pointing at another owner is rejected rather than silently fetched, so this
 * endpoint can only ever import the site owner's own repositories.
 */
function resolveRepoNames(requested, username) {
    const owner = String(username || '').trim().toLowerCase();
    const seen = new Set();
    const names = [];
    const rejected = [];

    for (const entry of requested) {
        const value = String(entry || '').trim().replace(/^\/+|\/+$/g, '');
        if (!value) continue;

        const parts = value.split('/');
        if (parts.length > 2) {
            rejected.push(value);
            continue;
        }

        const [maybeOwner, maybeRepo] = parts.length === 2 ? parts : [owner, parts[0]];
        if (!maybeRepo || String(maybeOwner).toLowerCase() !== owner) {
            rejected.push(value);
            continue;
        }

        const fullName = `${maybeOwner}/${maybeRepo}`;
        if (seen.has(fullName.toLowerCase())) continue;
        seen.add(fullName.toLowerCase());
        names.push(fullName);
    }

    return { names, rejected };
}

async function readRequestedRepos(request) {
    const body = await request.json().catch(() => ({}));
    const requested = Array.isArray(body?.repos)
        ? body.repos
        : (body?.repo ? [body.repo] : []);
    return requested;
}

async function loadSyncContext(requested) {
    const config = await getSingleton(prisma, 'github');
    if (!config?.username) {
        return { error: NextResponse.json({ success: false, error: 'GitHub username not configured' }, { status: 400 }) };
    }

    if (requested.length === 0) {
        return { error: NextResponse.json({ success: false, error: 'No repositories selected' }, { status: 400 }) };
    }

    if (requested.length > MAX_REPOS_PER_SYNC) {
        return {
            error: NextResponse.json(
                { success: false, error: `Select at most ${MAX_REPOS_PER_SYNC} repositories per sync` },
                { status: 400 }
            ),
        };
    }

    const { names, rejected } = resolveRepoNames(requested, config.username);
    if (names.length === 0) {
        return {
            error: NextResponse.json(
                { success: false, error: 'No repositories belonging to the configured account were selected', rejected },
                { status: 400 }
            ),
        };
    }

    // hiddenRepos is the admin's existing "do not surface this" list on the
    // GitHub dashboard. Honour it here too, so one control governs both.
    const hidden = new Set((config.hiddenRepos || []).map((name) => String(name).toLowerCase()));
    const allowed = names.filter((fullName) => !hidden.has(fullName.split('/')[1].toLowerCase()));

    return { config, names: allowed, rejected, token: await getGithubToken() };
}

/** GET — dry run. Reports what a sync would change without writing anything. */
async function previewSync(request) {
    const { searchParams } = new URL(request.url);
    const requested = searchParams.getAll('repo');
    const context = await loadSyncContext(requested);
    if (context.error) return context.error;

    const { names, token } = context;
    const results = [];

    for (const fullName of names) {
        try {
            const repo = await fetchRepo(fullName, { token });
            const existing = await prisma.project.findUnique({ where: { repoFullName: fullName } });
            const incoming = mapRepoToProject(repo);
            const { changes, pinned } = diffSyncedProject(existing, incoming);

            // Only fetch the README when a poster could actually be seeded —
            // otherwise the preview costs an extra upstream call per repo for
            // a result it would discard. Without this the preview would report
            // "no changes" and the sync would still set an image.
            if (!existing?.image && !pinned.includes('image')) {
                const readme = await fetchReadme(fullName, {
                    token,
                    branch: repo.default_branch || 'main',
                });
                const seededImage = seedImageFromReadme(existing, readme);
                if (seededImage) {
                    changes.push({ field: 'image', from: existing?.image ?? null, to: seededImage });
                }
            }

            results.push({
                repo: fullName,
                status: existing ? 'linked' : 'new',
                projectId: existing?.id || null,
                changes,
                pinned,
            });
        } catch (error) {
            results.push({ repo: fullName, status: 'error', error: error?.message || 'Preview failed' });
        }
    }

    return NextResponse.json({ success: true, data: results });
}

/** POST — perform the sync. */
async function runSync(request) {
    const requested = await readRequestedRepos(request);
    const context = await loadSyncContext(requested);
    if (context.error) return context.error;

    const { names, rejected, token } = context;
    const results = await syncRepositories(names, { token });

    return NextResponse.json({
        success: true,
        data: {
            results,
            rejected,
            summary: {
                created: results.filter((r) => r.status === 'created').length,
                updated: results.filter((r) => r.status === 'updated').length,
                failed: results.filter((r) => r.status === 'error').length,
            },
        },
    });
}

export const GET = withAuth(previewSync);
export const POST = withAuth(runSync);
export const dynamic = 'force-dynamic';
