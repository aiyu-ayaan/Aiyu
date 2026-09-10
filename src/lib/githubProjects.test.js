import { describe, it, expect, vi } from 'vitest';
import {
    absolutizeReadmeUrls,
    deriveStatus,
    deriveTechStack,
    deriveYear,
    diffSyncedProject,
    extractReadmeImage,
    fetchReadme,
    seedImageFromReadme,
    mapRepoToProject,
    mergeSyncedProject,
    truncateReadme,
    withPinnedFields,
    README_MAX_CHARS,
} from './githubProjects';

const repo = (overrides = {}) => ({
    name: 'TTS-Engine',
    full_name: 'aiyu-ayaan/TTS-Engine',
    description: 'Text-to-speech library',
    html_url: 'https://github.com/aiyu-ayaan/TTS-Engine',
    language: 'Kotlin',
    topics: ['android', 'library'],
    created_at: '2023-02-01T00:00:00Z',
    pushed_at: '2023-06-01T00:00:00Z',
    default_branch: 'main',
    ...overrides,
});

describe('mergeSyncedProject — non-destructive sync', () => {
    it('refreshes fields that are not pinned', () => {
        const existing = { description: 'old', pinnedFields: [] };
        const patch = mergeSyncedProject(existing, { description: 'new', name: 'Repo' });
        expect(patch.description).toBe('new');
        expect(patch.name).toBe('Repo');
    });

    it('leaves a pinned field untouched', () => {
        const existing = { description: 'hand written', pinnedFields: ['description'] };
        const patch = mergeSyncedProject(existing, { description: 'from github', name: 'Repo' });
        expect(patch).not.toHaveProperty('description');
        expect(patch.name).toBe('Repo');
    });

    it('never returns fields outside the syncable set', () => {
        const patch = mergeSyncedProject(
            { pinnedFields: [] },
            { name: 'Repo', displayOrder: 99, image: '/hack.png', slug: 'x', blogLink: 'y' }
        );
        expect(patch).not.toHaveProperty('displayOrder');
        expect(patch).not.toHaveProperty('image');
        expect(patch).not.toHaveProperty('slug');
        expect(patch).not.toHaveProperty('blogLink');
    });

    it('does not blank an existing value when the repo has none', () => {
        const patch = mergeSyncedProject(
            { description: 'kept', pinnedFields: [] },
            { description: '', techStack: [], name: 'Repo' }
        );
        expect(patch).not.toHaveProperty('description');
        expect(patch).not.toHaveProperty('techStack');
    });

    it('treats a first sync (no existing row) as fully unpinned', () => {
        const patch = mergeSyncedProject(null, mapRepoToProject(repo()));
        expect(patch.name).toBe('TTS-Engine');
        expect(patch.codeLink).toBe('https://github.com/aiyu-ayaan/TTS-Engine');
    });
});

describe('withPinnedFields', () => {
    it('adds edited syncable fields and stays idempotent', () => {
        expect(withPinnedFields([], ['description'])).toEqual(['description']);
        expect(withPinnedFields(['description'], ['description'])).toEqual(['description']);
    });

    it('ignores fields that sync never writes anyway', () => {
        expect(withPinnedFields([], ['displayOrder', 'slug'])).toEqual([]);
    });

    it('allows pinning the seeded image so a chosen poster is never replaced', () => {
        expect(withPinnedFields([], ['image'])).toEqual(['image']);
    });
});

describe('extractReadmeImage', () => {
    const RAW = 'https://raw.githubusercontent.com/aiyu-ayaan/Aiyu/main';

    it('returns the first real image', () => {
        const md = `# Aiyu\n\n![screenshot](${RAW}/docs/hero.png)\n`;
        expect(extractReadmeImage(md)).toBe(`${RAW}/docs/hero.png`);
    });

    it('skips a wall of shields.io badges to reach the screenshot', () => {
        const md = [
            '# Aiyu',
            '[![build](https://img.shields.io/badge/build-passing-green.svg)](https://ci.example.com)',
            '[![licence](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)',
            '[![npm](https://badgen.net/npm/v/aiyu)](https://npm.im/aiyu)',
            '',
            `![app screenshot](${RAW}/docs/screenshot.png)`,
        ].join('\n');
        expect(extractReadmeImage(md)).toBe(`${RAW}/docs/screenshot.png`);
    });

    it('skips GitHub Actions workflow badges', () => {
        const md = [
            '![CI](https://github.com/aiyu-ayaan/Aiyu/actions/workflows/ci.yml/badge.svg)',
            '![tests](https://github.com/aiyu-ayaan/Aiyu/workflows/tests/badge.svg)',
            `![demo](${RAW}/demo.gif)`,
        ].join('\n');
        expect(extractReadmeImage(md)).toBe(`${RAW}/demo.gif`);
    });

    it('skips deploy buttons', () => {
        const md = [
            '[![Deploy](https://vercel.com/button)](https://vercel.com/import)',
            '[![Run on Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)',
            `![cover](${RAW}/cover.jpg)`,
        ].join('\n');
        expect(extractReadmeImage(md)).toBe(`${RAW}/cover.jpg`);
    });

    it('finds a hero inside a raw <img> tag, which READMEs use for centering', () => {
        const md = `<p align="center"><img src="${RAW}/banner.png" alt="Aiyu banner" width="600"></p>`;
        expect(extractReadmeImage(md)).toBe(`${RAW}/banner.png`);
    });

    it('honours document order across markdown and HTML images', () => {
        const md = [
            '![badge](https://img.shields.io/badge/x-y-blue.svg)',
            `<img src="${RAW}/first.png" alt="first">`,
            `![second](${RAW}/second.png)`,
        ].join('\n');
        expect(extractReadmeImage(md)).toBe(`${RAW}/first.png`);
    });

    it('rejects badge-shaped alt text even on an unknown host', () => {
        const md = `![build status](https://ci.internal.example/status.png)\n![real](${RAW}/real.png)`;
        expect(extractReadmeImage(md)).toBe(`${RAW}/real.png`);
    });

    it('skips SVG, which on GitHub is nearly always a badge or icon', () => {
        const md = `![logo](${RAW}/logo.svg)\n![shot](${RAW}/shot.png)`;
        expect(extractReadmeImage(md)).toBe(`${RAW}/shot.png`);
    });

    it('does not mistake ordinary words for badge keywords', () => {
        const md = `![Buildings at dusk](${RAW}/buildings.png)`;
        expect(extractReadmeImage(md)).toBe(`${RAW}/buildings.png`);
    });

    it('returns null for a README that is only badges', () => {
        const md = '![build](https://img.shields.io/badge/build-passing-green.svg)';
        expect(extractReadmeImage(md)).toBeNull();
    });

    it('returns null for no README and no images', () => {
        expect(extractReadmeImage('')).toBeNull();
        expect(extractReadmeImage('# Title\n\nJust prose.')).toBeNull();
    });

    it('ignores relative URLs that were never absolutized', () => {
        expect(extractReadmeImage('![x](docs/a.png)')).toBeNull();
    });
});

describe('seedImageFromReadme', () => {
    const md = '![shot](https://raw.githubusercontent.com/a/b/main/shot.png)';

    it('seeds a poster when the project has none', () => {
        expect(seedImageFromReadme({ image: '' }, md)).toContain('shot.png');
        expect(seedImageFromReadme(null, md)).toContain('shot.png');
    });

    it('never replaces a poster the admin already chose', () => {
        expect(seedImageFromReadme({ image: '/uploads/mine.webp' }, md)).toBeNull();
    });

    it('respects a pinned image even when the field is empty', () => {
        expect(seedImageFromReadme({ image: '', pinnedFields: ['image'] }, md)).toBeNull();
    });
});

describe('diffSyncedProject', () => {
    it('reports only fields that actually change', () => {
        const existing = { name: 'TTS-Engine', description: 'old', pinnedFields: [] };
        const { changes } = diffSyncedProject(existing, mapRepoToProject(repo()));
        const fields = changes.map((c) => c.field);
        expect(fields).toContain('description');
        expect(fields).not.toContain('name');
    });

    it('surfaces pinned fields so the admin can see what is protected', () => {
        const existing = { description: 'mine', pinnedFields: ['description'] };
        const { changes, pinned } = diffSyncedProject(existing, mapRepoToProject(repo()));
        expect(pinned).toEqual(['description']);
        expect(changes.map((c) => c.field)).not.toContain('description');
    });
});

describe('derived fields', () => {
    it('builds a stack from language plus filtered topics', () => {
        const stack = deriveTechStack(repo({ topics: ['android', 'hacktoberfest', 'text-to-speech'] }));
        expect(stack[0]).toBe('Kotlin');
        expect(stack).toContain('Android');
        expect(stack).toContain('Text To Speech');
        expect(stack).not.toContain('Hacktoberfest');
    });

    it('renders a single year when created and last pushed in the same year', () => {
        expect(deriveYear(repo({ created_at: '2023-02-01Z', pushed_at: '2023-06-01Z' }))).toBe('2023');
    });

    it('renders a range for a long-running repo', () => {
        expect(deriveYear(repo({ created_at: '2021-08-01Z', pushed_at: '2025-01-01Z' }))).toBe('2021 - 2025');
    });

    it('maps recency onto the status vocabulary the archive filters by', () => {
        const now = Date.parse('2026-09-11T00:00:00Z');
        expect(deriveStatus(repo({ pushed_at: '2026-08-01Z' }), now)).toBe('Working');
        expect(deriveStatus(repo({ pushed_at: '2026-01-01Z' }), now)).toBe('Done');
        expect(deriveStatus(repo({ pushed_at: '2023-01-01Z' }), now)).toBe('Deferred');
        expect(deriveStatus(repo({ archived: true, pushed_at: '2023-01-01Z' }), now)).toBe('Done');
    });
});

describe('absolutizeReadmeUrls', () => {
    const full = 'aiyu-ayaan/TTS-Engine';

    it('points relative images at raw.githubusercontent so they actually load', () => {
        const out = absolutizeReadmeUrls('![demo](./docs/demo.png)', full, 'main');
        expect(out).toBe('![demo](https://raw.githubusercontent.com/aiyu-ayaan/TTS-Engine/main/docs/demo.png)');
    });

    it('points relative links at the repo blob view', () => {
        const out = absolutizeReadmeUrls('[guide](CONTRIBUTING.md)', full, 'main');
        expect(out).toBe('[guide](https://github.com/aiyu-ayaan/TTS-Engine/blob/main/CONTRIBUTING.md)');
    });

    it('leaves absolute URLs and in-page anchors alone', () => {
        const input = '[a](https://example.com) [b](#install) ![c](//cdn.io/x.png)';
        expect(absolutizeReadmeUrls(input, full, 'main')).toBe(input);
    });

    it('rewrites raw HTML img/src used by badges and centered headers', () => {
        const out = absolutizeReadmeUrls('<img src="art/logo.png"><a href="docs/x.md">d</a>', full, 'main');
        expect(out).toContain('src="https://raw.githubusercontent.com/aiyu-ayaan/TTS-Engine/main/art/logo.png"');
        expect(out).toContain('href="https://github.com/aiyu-ayaan/TTS-Engine/blob/main/docs/x.md"');
    });

    it('rewrites reference-style definitions', () => {
        const out = absolutizeReadmeUrls('[logo]: assets/logo.png\n', full, 'main');
        expect(out).toContain('[logo]: https://raw.githubusercontent.com');
    });

    it('honours a non-default branch', () => {
        const out = absolutizeReadmeUrls('![x](a.png)', full, 'develop');
        expect(out).toContain('/TTS-Engine/develop/a.png');
    });

    it('is a no-op without a repo name', () => {
        expect(absolutizeReadmeUrls('![x](a.png)', '', 'main')).toBe('![x](a.png)');
    });
});

describe('truncateReadme', () => {
    it('leaves a short README untouched', () => {
        expect(truncateReadme('# hi\n')).toBe('# hi\n');
    });

    it('caps a huge README at a line boundary', () => {
        const huge = `${'a'.repeat(50)}\n`.repeat(5000);
        const out = truncateReadme(huge);
        expect(out.length).toBeLessThan(README_MAX_CHARS + 100);
        expect(out).toMatch(/README truncated/);
    });
});

describe('fetchReadme', () => {
    it('returns null for a repo with no README instead of throwing', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
        await expect(fetchReadme('a/b', { fetchImpl })).resolves.toBeNull();
    });

    it('returns null when the request itself fails', async () => {
        const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
        await expect(fetchReadme('a/b', { fetchImpl })).resolves.toBeNull();
    });

    it('absolutizes what it fetches', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => '![x](img/a.png)',
        });
        const out = await fetchReadme('aiyu-ayaan/TTS-Engine', { fetchImpl, branch: 'main' });
        expect(out).toContain('https://raw.githubusercontent.com/aiyu-ayaan/TTS-Engine/main/img/a.png');
    });
});
