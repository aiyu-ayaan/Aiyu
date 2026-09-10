/**
 * Client-safe formatting for repo-backed project entries.
 *
 * Pure functions only, and no imports — these run in three client components
 * (home section, archive, detail) and must not pull server modules into the
 * browser bundle. Anything that needs the network or Prisma belongs in
 * lib/githubProjects.js instead.
 */

const STATUS_ALIASES = {
    done: 'Done',
    completed: 'Done',
    deferred: 'Deferred',
    deffered: 'Deferred',
    'on hold': 'Deferred',
    working: 'Working',
    'in progress': 'Working',
};

/** Fold the free-text status column onto the three values the filters use. */
export function normalizeStatus(status) {
    const value = String(status || '').trim().toLowerCase();
    if (!value) return 'Unknown';
    if (STATUS_ALIASES[value]) return STATUS_ALIASES[value];
    return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Accent per status, so state is not carried by position alone. */
export function statusAccent(status) {
    switch (normalizeStatus(status)) {
        case 'Working': return 'var(--accent-cyan)';
        case 'Done': return 'var(--accent-purple)';
        case 'Deferred': return 'var(--text-muted)';
        default: return 'var(--text-secondary)';
    }
}

/** 1200 → "1.2k". Keeps star counts from breaking the meta rail's rhythm. */
export function formatCount(value) {
    const count = Number(value) || 0;
    if (count < 1000) return String(count);
    if (count < 1_000_000) return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k`;
    return `${(count / 1_000_000).toFixed(1)}m`;
}

/** Coarse relative time. Recency is a ranking signal here, not a timestamp. */
export function relativeTime(value) {
    if (!value) return '';
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return '';

    const days = Math.floor((Date.now() - timestamp) / 86_400_000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    const years = Math.floor(days / 365);
    return years === 1 ? 'a year ago' : `${years}y ago`;
}

/** True when a repo has been pushed to recently enough to read as live. */
export function isActive(project, withinDays = 90) {
    const pushedAt = project?.repoData?.pushedAt;
    if (!pushedAt) return false;
    const days = (Date.now() - new Date(pushedAt).getTime()) / 86_400_000;
    return Number.isFinite(days) && days <= withinDays;
}

export function isSynced(project) {
    return project?.source === 'github' && Boolean(project?.repoData);
}

export function hasReadme(project) {
    return typeof project?.readme === 'string' && project.readme.trim().length > 0;
}

/** Last 4-digit year in the free-text `year` column; used for grouping/sorting. */
export function extractYear(value) {
    const matches = String(value || '').match(/\d{4}/g);
    if (!matches?.length) return 0;
    const year = Number.parseInt(matches[matches.length - 1], 10);
    return Number.isNaN(year) ? 0 : year;
}

export function displayOrderOf(project) {
    const order = Number.parseInt(project?.displayOrder, 10);
    return Number.isNaN(order) ? Number.MAX_SAFE_INTEGER : order;
}

/**
 * Admin order first, then recency. Deliberately not star count: a curated
 * portfolio should not silently reorder itself because a repo trended.
 */
export function compareProjects(a, b) {
    const orderDelta = displayOrderOf(a) - displayOrderOf(b);
    if (orderDelta !== 0) return orderDelta;
    return extractYear(b?.year) - extractYear(a?.year);
}

/** Aggregate stars/forks across synced entries, for the section's stat line. */
export function sumRepoStat(projects, key) {
    return (Array.isArray(projects) ? projects : []).reduce(
        (total, project) => total + (Number(project?.repoData?.[key]) || 0),
        0
    );
}
