#!/usr/bin/env node
// Expected outputs of src/lib/githubProjects.js for the Rust port (server/tests/fixtures/github-projects.json).
// Usage: node scripts/perf/github-fixtures.mjs
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const src = fileURLToPath(new URL('../../src', import.meta.url));
const server = await createServer({
    configFile: false, logLevel: 'error', resolve: { alias: { '@': src } },
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] },
});
// An undated repo takes the current year: pin the clock.
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : ['2026-06-15T12:00:00Z'])); } };
const g = await server.ssrLoadModule(`${src}/lib/githubProjects.js`);
const now = Date.parse('2026-06-15T12:00:00Z');

const full = {
    name: 'text-to-speech', full_name: 'me/text-to-speech', description: 'Says it', language: 'Rust', html_url: 'https://github.com/me/text-to-speech',
    homepage: 'https://example.org', topics: ['cli', 'hacktoberfest', 'rust', 'text-to-speech', 'api', 'a-b', ' UI ', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6'],
    stargazers_count: 5, forks_count: 2, subscribers_count: 3, watchers_count: 9, open_issues_count: 1, license: { spdx_id: 'MIT', name: 'MIT License' },
    default_branch: 'dev', created_at: '2021-03-01T00:00:00Z', pushed_at: '2026-06-01T00:00:00Z', archived: false, fork: false, private: false,
};
const repos = [
    full,
    {},
    { name: 'a', fork: true, created_at: '2025-01-01T00:00:00Z', pushed_at: '2025-12-01T00:00:00Z', license: { spdx_id: 'NOASSERTION', name: 'Other' } },
    { name: 'b', topics: ['SDK'], created_at: '2020-01-01T00:00:00Z', pushed_at: '2020-06-01T00:00:00Z', watchers_count: 4 },
    { name: 'c', topics: ['android'], updated_at: '2026-01-01T00:00:00Z', created_at: '2019-01-01T00:00:00Z', archived: true },
    { name: 'd', homepage: 'x', created_at: '1969-01-01T00:00:00Z', pushed_at: 'nonsense', private: true },
    { name: 'e', topics: ['ios', 'library'], language: 'Swift', created_at: '2024-01-01T00:00:00Z', pushed_at: '2025-08-01T00:00:00Z', license: { name: 'Custom' } },
];

const incoming = g.mapRepoToProject(full, now);
const existing = [
    null,
    { ...incoming, pinnedFields: [] },
    { ...incoming, name: 'Mine', description: 'Mine', techStack: ['Go'], pinnedFields: ['name'] },
    { name: 'x', description: 'y', techStack: [], year: '1', status: 'Done', projectType: 'Web', codeLink: null, pinnedFields: ['techStack', 'image'] },
];
const merges = [];
for (const e of existing) {
    for (const inc of [incoming, g.mapRepoToProject({ name: 'only' }, now)]) {
        merges.push({ existing: e, incoming: inc, patch: g.mergeSyncedProject(e, inc), diff: g.diffSyncedProject(e, inc) });
    }
}

const readmes = [
    '',
    '![shot](./docs/shot.png)',
    '[Contributing](CONTRIBUTING.md) and [site](https://x.org) and [top](#top) and [mail](mailto:a@b.c)',
    '![badge](https://img.shields.io/x.png)\n![ok](/assets/ok.jpg "t")',
    '[logo]: assets/logo.png\n[doc]: ./docs/a.md\n[web]: //cdn.org/a.png',
    '<img src="media/a.webp" alt="demo"> <a href=\'docs/b.md\'>b</a> <img src="https://example.org/build.png" alt="build status">',
    '![license](https://example.org/a.png) ![x](https://example.org/actions/workflows/a.png) ![y](https://example.org/badges/a.png) ![z](https://example.org/pic.svg) ![w](https://example.org/pic.gif?raw=1)',
    '![buildings](https://example.org/buildings.png)',
    '![a](#x) ![b](data:image/png;base64,AA==)\n\n   [ref]:    spaced/file.zip',
    '![é](images/é.png) text',
].map((markdown) => {
    const absolute = g.absolutizeReadmeUrls(markdown, 'me/repo', 'dev');
    return { markdown, absolute, image: g.extractReadmeImage(absolute) };
});

const truncations = [['short', 10], ['line one\nline two\nline three', 12], ['a\nbcdefghijklmnop', 10], ['éééé😀😀😀\nzz', 8], ['exact', 5]]
    .map(([text, max]) => ({ text, max, out: g.truncateReadme(text, max) }));

await server.close();
const out = { now: new Date(now).toISOString(), repos: repos.map((repo) => ({ repo, project: g.mapRepoToProject(repo, now), data: g.buildRepoData(repo) })), merges, readmes, truncations };
// buildRepoData and the mappers read the clock only through `now`, except the year of an undated repo.
await writeFile(new URL('../../server/tests/fixtures/github-projects.json', import.meta.url), `${JSON.stringify(out, null, 1)}\n`);
console.log(`repos ${out.repos.length}, merges ${merges.length}, readmes ${readmes.length}`);
process.exit(0);
