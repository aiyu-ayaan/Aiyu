/**
 * GitHub repository → Project mapping and merge rules.
 *
 * This module owns the *policy* of syncing (what a repo maps to, what a sync is
 * allowed to overwrite, how README markdown is made safe to render on our own
 * domain). Network plumbing — timeouts, the shared GitHub circuit breaker — is
 * delegated to lib/upstreamControl.js, which already owns that concern for
 * /api/github/stats. Persistence lives in the route handler.
 *
 * The central invariant is NON-DESTRUCTIVE SYNC: a Project row carries
 * `pinnedFields`, the list of fields the admin has edited by hand. A sync
 * refreshes every syncable field EXCEPT those, so re-syncing can never silently
 * discard authored copy. See `mergeSyncedProject`.
 *
 * Pure functions are exported individually and unit-tested; `fetchImpl` is
 * injectable so tests never touch the network.
 */
import { fetchWithTimeout, runWithCircuitBreaker } from '@/lib/upstreamControl';
import { PINNABLE_FIELDS, SEEDED_FIELDS, SYNCABLE_FIELDS } from '@/lib/projectSyncFields';

const GITHUB_API = 'https://api.github.com';
const GITHUB_RAW = 'https://raw.githubusercontent.com';
const GITHUB_WEB = 'https://github.com';

// Same breaker name as /api/github/stats on purpose: one upstream, one budget.
// A sync storm must trip the same breaker that protects the public stats route.
const GITHUB_BREAKER_NAME = 'github-upstream';
const GITHUB_BREAKER_OPTIONS = {
    failureThreshold: Number.parseInt(process.env.GITHUB_UPSTREAM_BREAKER_THRESHOLD || '5', 10),
    resetTimeoutMs: Number.parseInt(process.env.GITHUB_UPSTREAM_BREAKER_RESET_MS || '30000', 10),
};

// READMEs are larger and slower than the JSON endpoints, so they get their own
// budget rather than inheriting the 2.5s stats timeout.
const GITHUB_TIMEOUT_MS = Number.parseInt(process.env.GITHUB_UPSTREAM_TIMEOUT_MS || '2500', 10);
const README_TIMEOUT_MS = Number.parseInt(process.env.GITHUB_README_TIMEOUT_MS || '6000', 10);

// A README is a display blob, not a document store. Anything past this is
// truncated at a line boundary so one pathological repo cannot bloat every
// projects query that selects the column.
export const README_MAX_CHARS = 120_000;

// Re-exported so server callers have one import for the whole sync vocabulary;
// the lists themselves live in a leaf module the client can import safely.
export { SYNCABLE_FIELDS, SEEDED_FIELDS, PINNABLE_FIELDS };

/** Repo topic/language values that describe the repo, not a technology. */
const TOPIC_STOPWORDS = new Set([
    'hacktoberfest', 'awesome', 'awesome-list', 'portfolio', 'demo', 'example',
    'examples', 'tutorial', 'boilerplate', 'starter', 'template', 'sample',
]);

// Short words that are grammar, not acronyms. Without this the acronym rule
// below turns "text-to-speech" into "Text TO Speech".
const CONNECTOR_WORDS = new Set(['to', 'of', 'in', 'on', 'for', 'and', 'the', 'a', 'an', 'at', 'by']);

/**
 * Topics are lowercase-hyphenated by GitHub; restore something presentable.
 * Short words are uppercased because they are nearly always acronyms in this
 * domain (api, cli, sdk, ui, css) — except the connectors above.
 */
function humanizeTopic(topic) {
    return String(topic)
        .split('-')
        .filter(Boolean)
        .map((word) => (word.length <= 3 && !CONNECTOR_WORDS.has(word)
            ? word.toUpperCase()
            : word.charAt(0).toUpperCase() + word.slice(1)))
        .join(' ');
}

/**
 * Tech stack from the repo's primary language plus its topics. Topics are
 * user-authored labels, so they are filtered against stopwords and capped —
 * an unbounded list would blow out the stack row in every card.
 */
export function deriveTechStack(repo = {}) {
    const stack = [];
    if (repo.language) stack.push(repo.language);

    const topics = Array.isArray(repo.topics) ? repo.topics : [];
    for (const topic of topics) {
        const normalized = String(topic || '').trim().toLowerCase();
        if (!normalized || TOPIC_STOPWORDS.has(normalized)) continue;
        const label = humanizeTopic(normalized);
        if (!stack.some((entry) => entry.toLowerCase() === label.toLowerCase())) {
            stack.push(label);
        }
        if (stack.length >= 8) break;
    }

    return stack;
}

/**
 * Display year: "2021 - 2025" for a repo still being pushed to, a single year
 * when created and last pushed in the same year. Matches the existing manual
 * `year` convention that ProjectsV2 groups and sorts on.
 */
export function deriveYear(repo = {}) {
    const createdYear = new Date(repo.created_at || 0).getUTCFullYear();
    const pushedYear = new Date(repo.pushed_at || repo.updated_at || 0).getUTCFullYear();
    if (!Number.isFinite(createdYear) || createdYear <= 1970) return String(new Date().getUTCFullYear());
    if (!Number.isFinite(pushedYear) || pushedYear <= createdYear) return String(createdYear);
    return `${createdYear} - ${pushedYear}`;
}

/**
 * Status from repo signals, mapped onto the vocabulary ProjectsV2 already
 * filters by ("Done" / "Working" / "Deferred"). Archived is explicit; otherwise
 * a repo untouched for over a year reads as parked rather than in progress.
 */
export function deriveStatus(repo = {}, now = Date.now()) {
    if (repo.archived) return 'Done';
    const pushedAt = new Date(repo.pushed_at || repo.updated_at || 0).getTime();
    if (!Number.isFinite(pushedAt) || pushedAt <= 0) return 'Deferred';
    const daysSincePush = (now - pushedAt) / 86_400_000;
    if (daysSincePush <= 120) return 'Working';
    if (daysSincePush <= 365) return 'Done';
    return 'Deferred';
}

/** Coarse type used by the archive's type filter. */
export function deriveProjectType(repo = {}) {
    if (repo.fork) return 'Fork';
    const topics = (Array.isArray(repo.topics) ? repo.topics : []).map((t) => String(t).toLowerCase());
    if (topics.includes('library') || topics.includes('sdk')) return 'Library';
    if (topics.includes('cli')) return 'CLI';
    if (topics.includes('android') || topics.includes('ios') || topics.includes('mobile')) return 'Mobile';
    if (repo.homepage) return 'Web';
    return 'Open Source';
}

/**
 * The display-only snapshot stored in `Project.repoData`. Deliberately a
 * whitelist: the raw GitHub payload is ~100 fields of mostly API URLs, and
 * storing it verbatim would put owner metadata we never render into the DB.
 */
export function buildRepoData(repo = {}) {
    return {
        fullName: repo.full_name || '',
        htmlUrl: repo.html_url || '',
        homepage: repo.homepage || '',
        stars: Number(repo.stargazers_count) || 0,
        forks: Number(repo.forks_count) || 0,
        watchers: Number(repo.subscribers_count ?? repo.watchers_count) || 0,
        openIssues: Number(repo.open_issues_count) || 0,
        language: repo.language || '',
        topics: Array.isArray(repo.topics) ? repo.topics.slice(0, 12) : [],
        license: repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION'
            ? repo.license.spdx_id
            : (repo.license?.name || ''),
        defaultBranch: repo.default_branch || 'main',
        isArchived: Boolean(repo.archived),
        isFork: Boolean(repo.fork),
        isPrivate: Boolean(repo.private),
        pushedAt: repo.pushed_at || null,
        createdAt: repo.created_at || null,
    };
}

/** GitHub repo → the syncable subset of a Project row. */
export function mapRepoToProject(repo = {}, now = Date.now()) {
    return {
        name: repo.name || '',
        description: repo.description || '',
        techStack: deriveTechStack(repo),
        year: deriveYear(repo),
        status: deriveStatus(repo, now),
        projectType: deriveProjectType(repo),
        codeLink: repo.html_url || '',
    };
}

/**
 * Merge a freshly mapped repo onto an existing row.
 *
 * The one rule that matters: a field listed in `existing.pinnedFields` is left
 * exactly as the admin left it. Everything else in SYNCABLE_FIELDS refreshes.
 * Fields outside SYNCABLE_FIELDS are never returned, so the caller cannot
 * accidentally clobber displayOrder, image, slug or blogLink through a sync.
 *
 * @param {object|null} existing  Current Project row (null for a first sync).
 * @param {object} incoming       Output of mapRepoToProject.
 * @returns {object} Patch containing only fields the sync is allowed to write.
 */
export function mergeSyncedProject(existing, incoming) {
    const pinned = new Set(Array.isArray(existing?.pinnedFields) ? existing.pinnedFields : []);
    const patch = {};

    for (const field of SYNCABLE_FIELDS) {
        if (pinned.has(field)) continue;
        const value = incoming[field];
        // A repo with no description must not blank out a description the admin
        // wrote before pinning it; empty incoming values are simply skipped.
        if (value === undefined || value === null) continue;
        if (typeof value === 'string' && value.trim() === '') continue;
        if (Array.isArray(value) && value.length === 0) continue;
        patch[field] = value;
    }

    return patch;
}

/**
 * Add a field to a row's pin list. Called when the admin edits a synced project
 * so the next sync leaves that field alone. Idempotent, and ignores fields that
 * are not syncable in the first place (they are already admin-owned).
 */
export function withPinnedFields(currentPinned = [], changedFields = []) {
    const pinned = new Set(Array.isArray(currentPinned) ? currentPinned : []);
    for (const field of changedFields) {
        if (PINNABLE_FIELDS.includes(field)) pinned.add(field);
    }
    return [...pinned];
}

/**
 * Compare a stored row against a mapped repo to report what a sync WOULD change.
 * Powers the admin preview so a sync is never a blind write.
 */
export function diffSyncedProject(existing, incoming) {
    const patch = mergeSyncedProject(existing, incoming);
    const pinned = new Set(Array.isArray(existing?.pinnedFields) ? existing.pinnedFields : []);

    const changes = [];
    for (const [field, nextValue] of Object.entries(patch)) {
        const currentValue = existing?.[field];
        const same = Array.isArray(nextValue)
            ? JSON.stringify(currentValue || []) === JSON.stringify(nextValue)
            : currentValue === nextValue;
        if (!same) changes.push({ field, from: currentValue ?? null, to: nextValue });
    }

    return { changes, pinned: [...pinned] };
}

// ─────────────────────────── README handling ───────────────────────────

const MARKDOWN_INLINE_LINK = /(!?)\[([^\]]*)\]\(\s*([^)\s]+)([^)]*)\)/g;
const MARKDOWN_REFERENCE_LINK = /^(\s*\[[^\]]+\]:\s*)(\S+)/gm;
const HTML_SRC_OR_HREF = /\b(src|href)=("|')([^"']+)\2/gi;

const ASSET_EXTENSION = /\.(png|jpe?g|gif|svg|webp|avif|bmp|ico|mp4|webm|mov)(\?.*)?$/i;

/**
 * Whether a path should resolve to raw.githubusercontent rather than the blob
 * view. Markdown image syntax is the obvious signal, but reference-style
 * definitions (`[logo]: assets/logo.png`) carry no syntax marker at all, so the
 * file extension is the only way to tell — and a blob URL there would render
 * GitHub's HTML page inside an <img>.
 */
function isAssetPath(url) {
    return ASSET_EXTENSION.test(String(url || '').trim());
}

function isAbsoluteOrAnchor(url) {
    const value = String(url || '').trim();
    if (!value) return true;
    // Protocol-relative, absolute, in-page anchor, or a mail/data URI.
    return /^(https?:)?\/\//i.test(value)
        || value.startsWith('#')
        || /^[a-z][a-z0-9+.-]*:/i.test(value);
}

/**
 * Resolve one relative README path against the repo.
 *
 * Images must resolve to raw.githubusercontent.com (blob URLs serve an HTML
 * page, not an image); everything else resolves to the repo's blob view so
 * links land on GitHub's rendered file.
 */
function resolveRepoUrl(rawUrl, fullName, branch, { asAsset }) {
    const value = String(rawUrl || '').trim().replace(/^\.\//, '');
    const clean = value.replace(/^\/+/, '');
    if (!clean) return rawUrl;
    return asAsset
        ? `${GITHUB_RAW}/${fullName}/${branch}/${clean}`
        : `${GITHUB_WEB}/${fullName}/blob/${branch}/${clean}`;
}

/**
 * Rewrite relative URLs in README markdown to absolute GitHub URLs.
 *
 * Without this, a README's `./docs/demo.png` resolves against OUR origin and
 * 404s, and `[CONTRIBUTING](CONTRIBUTING.md)` links into a page that does not
 * exist on this site. Covers inline links/images, reference-style definitions,
 * and raw HTML src/href (READMEs frequently use <img> for badges and centering).
 */
export function absolutizeReadmeUrls(markdown, fullName, branch = 'main') {
    if (!markdown || !fullName) return markdown || '';

    let output = String(markdown);

    output = output.replace(MARKDOWN_INLINE_LINK, (match, bang, text, url, tail) => {
        if (isAbsoluteOrAnchor(url)) return match;
        const resolved = resolveRepoUrl(url, fullName, branch, {
            asAsset: bang === '!' || isAssetPath(url),
        });
        return `${bang}[${text}](${resolved}${tail})`;
    });

    output = output.replace(MARKDOWN_REFERENCE_LINK, (match, prefix, url) => {
        if (isAbsoluteOrAnchor(url)) return match;
        return `${prefix}${resolveRepoUrl(url, fullName, branch, { asAsset: isAssetPath(url) })}`;
    });

    output = output.replace(HTML_SRC_OR_HREF, (match, attr, quote, url) => {
        if (isAbsoluteOrAnchor(url)) return match;
        const resolved = resolveRepoUrl(url, fullName, branch, {
            asAsset: attr.toLowerCase() === 'src' || isAssetPath(url),
        });
        return `${attr}=${quote}${resolved}${quote}`;
    });

    return output;
}

// ─────────────────────── README hero extraction ───────────────────────

/**
 * Hosts that only ever serve status badges, shields, and one-click deploy
 * buttons. A README's first image is almost always one of these, so host
 * matching does most of the work of finding the real hero image.
 */
const BADGE_HOSTS = new Set([
    'img.shields.io', 'shields.io', 'badgen.net', 'badge.fury.io',
    'travis-ci.org', 'travis-ci.com', 'api.travis-ci.com',
    'ci.appveyor.com', 'codecov.io', 'coveralls.io', 'snyk.io',
    'api.codeclimate.com', 'david-dm.org', 'forthebadge.com',
    'sonarcloud.io', 'api.netlify.com', 'maven-badges.herokuapp.com',
    'isitmaintained.com', 'bestpractices.coreinfrastructure.org',
    'deepsource.io', 'app.fossa.com', 'badge.buildkite.com',
    'hits.seeyoufarm.com', 'visitor-badge.laobi.icu', 'visitor-badge.glitch.me',
    'komarev.com', 'img.buymeacoffee.com', 'www.herokucdn.com',
    'deploy.cloud.run', 'gitpod.io', 'vercel.com', 'railway.app',
    'opencollective.com', 'jitpack.io', 'poser.pugx.org',
]);

/** Badge-shaped URL paths that appear on otherwise legitimate hosts. */
const BADGE_PATH_PATTERNS = [
    /\/badge(s)?\b/i,            // .../badge.svg, /badges/...
    /badge\.(svg|png)$/i,
    /\/actions\/workflows\//i,   // GitHub Actions workflow badges
    /\/workflows\/[^/]+\/badge/i,
    /\/button\.(svg|png)$/i,     // "Deploy to X" buttons
    /\/shield/i,
];

/**
 * Alt text that describes a badge rather than a picture. Matched as whole words
 * so "buildings.png" or "License to Kill" screenshots are not caught by
 * substring accidents.
 */
const BADGE_ALT_PATTERN = new RegExp(
    '\\b('
    + 'badge|shield|build|ci|cd|pipeline|coverage|codecov|licen[cs]e|version'
    + '|downloads?|stars?|forks?|issues?|release|npm|pypi|maven|gradle|jitpack'
    + '|sponsor|donate|patreon|discord|twitter|slack|gitter|contributors?'
    + ')\\b',
    'i'
);

/** Extensions that make a plausible card image. SVG is excluded: on GitHub it
 *  is overwhelmingly a badge or icon, not a screenshot. */
const HERO_EXTENSION = /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i;

/**
 * Whether an image reference is a badge/button rather than real artwork.
 * Exported for tests — the badge list is the part most likely to need tuning.
 */
export function isBadgeImage(url, alt = '') {
    const value = String(url || '').trim();
    if (!value) return true;

    let parsed;
    try {
        parsed = new URL(value);
    } catch {
        return true; // Unresolvable: not safe to use as a poster.
    }

    if (BADGE_HOSTS.has(parsed.hostname.toLowerCase())) return true;
    if (BADGE_PATH_PATTERNS.some((pattern) => pattern.test(parsed.pathname))) return true;
    if (BADGE_ALT_PATTERN.test(String(alt || ''))) return true;

    return false;
}

/**
 * The first real image in a README, to use as a project poster.
 *
 * Scans markdown images, reference definitions and raw <img> tags in document
 * order and returns the first that survives the badge filters and looks like a
 * raster image. Returns null when a README is all badges, or has no images —
 * the common case, and not an error.
 *
 * Expects markdown that has already been through absolutizeReadmeUrls, so the
 * URLs are absolute and resolvable.
 */
export function extractReadmeImage(markdown) {
    const content = String(markdown || '');
    if (!content) return null;

    const candidates = [];

    for (const match of content.matchAll(/!\[([^\]]*)\]\(\s*([^)\s]+)[^)]*\)/g)) {
        candidates.push({ index: match.index, alt: match[1], url: match[2] });
    }

    for (const match of content.matchAll(/<img\b[^>]*>/gi)) {
        const tag = match[0];
        const src = tag.match(/\bsrc=("|')([^"']+)\1/i)?.[2];
        if (!src) continue;
        const alt = tag.match(/\balt=("|')([^"']*)\1/i)?.[2] || '';
        candidates.push({ index: match.index, alt, url: src });
    }

    candidates.sort((a, b) => a.index - b.index);

    for (const { url, alt } of candidates) {
        if (!HERO_EXTENSION.test(url)) continue;
        if (isBadgeImage(url, alt)) continue;
        return url;
    }

    return null;
}

/**
 * Poster to store for a synced project, or null to leave the current one.
 *
 * Seeding, never overwriting: an image the admin has chosen (or pinned) always
 * wins, so re-syncing cannot swap out a curated poster for whatever currently
 * sits at the top of the README.
 */
export function seedImageFromReadme(existing, readme) {
    if (existing?.image) return null;
    if (Array.isArray(existing?.pinnedFields) && existing.pinnedFields.includes('image')) return null;
    return extractReadmeImage(readme);
}

/** Truncate at a line boundary so markdown is never cut mid-fence. */
export function truncateReadme(markdown, maxChars = README_MAX_CHARS) {
    const value = String(markdown || '');
    if (value.length <= maxChars) return value;
    const clipped = value.slice(0, maxChars);
    const lastBreak = clipped.lastIndexOf('\n');
    const body = lastBreak > maxChars * 0.5 ? clipped.slice(0, lastBreak) : clipped;
    return `${body}\n\n*(README truncated.)*`;
}

// ─────────────────────────── Network ───────────────────────────

export function createGithubHeaders(token) {
    const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Portfolio-App',
        'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) headers.Authorization = `token ${token}`;
    return headers;
}

async function githubRequest(url, headers, { timeoutMs = GITHUB_TIMEOUT_MS, fetchImpl } = {}) {
    return runWithCircuitBreaker(
        GITHUB_BREAKER_NAME,
        () => (fetchImpl
            ? fetchImpl(url, { headers })
            : fetchWithTimeout(url, { headers }, timeoutMs)),
        GITHUB_BREAKER_OPTIONS
    );
}

/** Fetch one repository. Returns the raw GitHub payload, or throws with `status`. */
export async function fetchRepo(fullName, { token, fetchImpl } = {}) {
    const response = await githubRequest(
        `${GITHUB_API}/repos/${fullName}`,
        createGithubHeaders(token),
        { fetchImpl }
    );

    if (!response.ok) {
        const error = new Error(`GitHub repo fetch failed (${response.status})`);
        error.status = response.status;
        throw error;
    }

    return response.json();
}

/**
 * Fetch a repo's README as raw markdown, already absolutized and truncated.
 *
 * A missing README is normal (404) and yields null rather than throwing — one
 * repo without a README must not fail the whole sync batch.
 */
export async function fetchReadme(fullName, { token, branch = 'main', fetchImpl } = {}) {
    const headers = { ...createGithubHeaders(token), Accept: 'application/vnd.github.raw' };

    let response;
    try {
        response = await githubRequest(`${GITHUB_API}/repos/${fullName}/readme`, headers, {
            timeoutMs: README_TIMEOUT_MS,
            fetchImpl,
        });
    } catch (error) {
        console.warn(`[github-sync] README fetch failed for ${fullName}:`, error?.message || error);
        return null;
    }

    if (!response.ok) return null;

    const markdown = await response.text();
    if (!markdown.trim()) return null;

    return truncateReadme(absolutizeReadmeUrls(markdown, fullName, branch));
}
