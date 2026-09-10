/**
 * POST /api/github/sync — pull selected repositories into Project rows.
 *
 * Manual only, by design: there is no cron and no fetch-on-render. The admin
 * picks repos and presses sync, so GitHub's rate limit is spent on an explicit
 * action rather than on visitor traffic.
 *
 * GET returns a dry-run preview (what each repo would change, and which fields
 * are pinned) so a sync is never a blind write.
 *
 * Sync policy — which fields may be written and how pinning protects manual
 * edits — lives in lib/githubProjects.js; this route owns persistence,
 * authorization, cache invalidation and search-index pings.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toClient, getSingleton } from '@/lib/serialize';
import { withAuth } from '@/middleware/auth';
import { decrypt } from '@/lib/encryption';
import cache from '@/lib/cache';
import { autoPing } from '@/lib/autoIndexing';
import { createUniqueProjectSlug, getProjectSlug } from '@/lib/contentSlugs';
import {
    buildRepoData,
    diffSyncedProject,
    fetchReadme,
    fetchRepo,
    mapRepoToProject,
    mergeSyncedProject,
} from '@/lib/githubProjects';

// One press should not be able to start an unbounded fan-out of upstream calls.
const MAX_REPOS_PER_SYNC = 30;

async function getToken() {
    const config = await getSingleton(prisma, 'config', { withSecrets: true });
    if (config?.encryptedGithubToken) return decrypt(config.encryptedGithubToken);
    return process.env.GITHUB_TOKEN?.trim() || null;
}

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

    return { config, names: allowed, rejected, token: await getToken() };
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
    const results = [];
    const pingPaths = new Set();

    for (const fullName of names) {
        try {
            const repo = await fetchRepo(fullName, { token });
            const repoData = buildRepoData(repo);
            const incoming = mapRepoToProject(repo);
            const existing = await prisma.project.findUnique({ where: { repoFullName: fullName } });

            const readme = await fetchReadme(fullName, { token, branch: repoData.defaultBranch });

            // Only fields the merge allows; pinned edits are already excluded.
            const patch = mergeSyncedProject(existing, incoming);

            const syncMetadata = {
                source: 'github',
                repoFullName: fullName,
                repoData,
                syncedAt: new Date(),
                ...(readme ? { readme, readmeFetchedAt: new Date() } : {}),
            };

            let row;
            if (existing) {
                row = await prisma.project.update({
                    where: { id: existing.id },
                    data: { ...patch, ...syncMetadata },
                });
            } else {
                // A new row needs the non-syncable fields the schema requires;
                // they are seeded once here and owned by the admin thereafter.
                const name = patch.name || repo.name;
                row = await prisma.project.create({
                    data: {
                        ...patch,
                        name,
                        description: patch.description || '',
                        year: patch.year || String(new Date().getUTCFullYear()),
                        status: patch.status || 'Working',
                        projectType: patch.projectType || 'Open Source',
                        slug: await createUniqueProjectSlug(null, name),
                        ...syncMetadata,
                    },
                });
            }

            const client = toClient('project', row);
            pingPaths.add(`/projects/${getProjectSlug(client)}`);

            results.push({
                repo: fullName,
                status: existing ? 'updated' : 'created',
                projectId: client._id,
                slug: getProjectSlug(client),
                readme: Boolean(readme),
                fieldsWritten: Object.keys(patch),
                pinnedSkipped: (existing?.pinnedFields || []).filter((f) => f in incoming),
            });
        } catch (error) {
            console.error(`[github-sync] ${fullName} failed:`, error);
            results.push({
                repo: fullName,
                status: 'error',
                error: error?.status === 404
                    ? 'Repository not found or not visible to the configured token'
                    : (error?.message || 'Sync failed'),
            });
        }
    }

    const wrote = results.some((r) => r.status === 'created' || r.status === 'updated');
    if (wrote) {
        await cache.invalidatePrefixAsync('db:projects');
        // Ping the detail pages plus the index, so newly synced repos are
        // submitted for crawling rather than only appearing in sitemap.xml.
        autoPing([...pingPaths, '/projects']);
    }

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
