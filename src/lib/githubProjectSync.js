/**
 * Persistence half of GitHub → Project sync.
 *
 * lib/githubProjects.js owns the policy (mapping, pin-aware merge, README
 * handling); this module applies it to the database. It is shared by the
 * admin-triggered route, the scheduled `github_project_sync` cron task and the
 * push webhook, so all three write rows the same way.
 */
import { prisma } from '@/lib/prisma';
import { getSingleton, toClient } from '@/lib/serialize';
import { decrypt } from '@/lib/encryption';
import cache from '@/lib/cache';
import { autoPing } from '@/lib/autoIndexing';
import { createUniqueProjectSlug, getProjectSlug } from '@/lib/contentSlugs';
import {
    buildRepoData,
    fetchReadme,
    fetchRepo,
    mapRepoToProject,
    mergeSyncedProject,
    seedImageFromReadme,
} from '@/lib/githubProjects';

export async function getGithubToken() {
    const config = await getSingleton(prisma, 'config', { withSecrets: true });
    if (config?.encryptedGithubToken) return decrypt(config.encryptedGithubToken);
    return process.env.GITHUB_TOKEN?.trim() || null;
}

/**
 * Sync one repository into its Project row (creating it when missing).
 *
 * With `onlyIfChanged`, an existing row whose stored snapshot already matches
 * the repo's pushedAt/stars/forks/etc. is left alone and the README is not
 * refetched — the automatic paths run often, so an unchanged repo should cost
 * exactly one API call and no write.
 */
export async function syncRepository(fullName, { token, onlyIfChanged = false } = {}) {
    const repo = await fetchRepo(fullName, { token });
    const repoData = buildRepoData(repo);
    const incoming = mapRepoToProject(repo);
    const existing = await prisma.project.findUnique({ where: { repoFullName: fullName } });

    if (onlyIfChanged && existing
        && JSON.stringify(existing.repoData || {}) === JSON.stringify(repoData)) {
        return { repo: fullName, status: 'unchanged', projectId: existing.id };
    }

    const readme = await fetchReadme(fullName, { token, branch: repoData.defaultBranch });

    // Only fields the merge allows; pinned edits are already excluded.
    const patch = mergeSyncedProject(existing, incoming);

    // Seed a poster from the README's first non-badge image, but only
    // when the project has none — a curated image always wins.
    const seededImage = seedImageFromReadme(existing, readme);
    if (seededImage) patch.image = seededImage;

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
    return {
        repo: fullName,
        status: existing ? 'updated' : 'created',
        projectId: client._id,
        slug: getProjectSlug(client),
        readme: Boolean(readme),
        image: seededImage || null,
        fieldsWritten: Object.keys(patch),
        pinnedSkipped: (existing?.pinnedFields || []).filter((f) => f in incoming),
    };
}

/**
 * Sync a list of repos sequentially. One failing repo is reported, not thrown,
 * so it never aborts the batch. Invalidates the projects cache and pings the
 * search index when anything was written.
 */
export async function syncRepositories(names, { token, onlyIfChanged = false } = {}) {
    const results = [];

    for (const fullName of names) {
        try {
            results.push(await syncRepository(fullName, { token, onlyIfChanged }));
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

    const written = results.filter((r) => r.status === 'created' || r.status === 'updated');
    if (written.length > 0) {
        await cache.invalidatePrefixAsync('db:projects');
        // Ping the detail pages plus the index, so newly synced repos are
        // submitted for crawling rather than only appearing in sitemap.xml.
        autoPing([...new Set(written.map((r) => `/projects/${r.slug}`)), '/projects']);
    }

    return results;
}

/**
 * Re-sync every Project already linked to a repo. Used by the scheduled task;
 * honours the GitHub dashboard's hiddenRepos list like the manual sync does.
 */
export async function syncLinkedRepositories() {
    const config = await getSingleton(prisma, 'github');
    const hidden = new Set((config?.hiddenRepos || []).map((name) => String(name).toLowerCase()));

    const linked = await prisma.project.findMany({
        where: { source: 'github', repoFullName: { not: null } },
        select: { repoFullName: true },
    });
    const names = linked
        .map((row) => row.repoFullName)
        .filter((fullName) => !hidden.has(fullName.split('/')[1]?.toLowerCase()));

    const results = await syncRepositories(names, { token: await getGithubToken(), onlyIfChanged: true });
    return {
        results,
        summary: {
            total: results.length,
            updated: results.filter((r) => r.status === 'updated').length,
            unchanged: results.filter((r) => r.status === 'unchanged').length,
            failed: results.filter((r) => r.status === 'error').length,
        },
    };
}
