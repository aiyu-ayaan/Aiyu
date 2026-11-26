// GitHub integration settings, repo sync refusals and the push webhook. The sync cases call api.github.com for the
// configured account (a few of the 60 requests an hour allowed without a token).
import { createCipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PAST } from './_shared.mjs';

const cases = [];
const add = (models, method, path, name, rest = {}) => cases.push({ models, method, path, name, ...rest });

const encrypt = (text) => {
    const iv = randomBytes(16);
    const key = createHash('sha256').update(String(process.env.JWT_SECRET)).digest('base64').substring(0, 32);
    const cipher = createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    return `${iv.toString('hex')}:${Buffer.concat([cipher.update(text), cipher.final()]).toString('hex')}`;
};
const secrets = (data) => async (p) => {
    const row = await p.config.findFirst();
    await p.config.update({ where: { id: row.id }, data: { ...data, updatedAt: row.updatedAt } });
};
const prisma = new PrismaClient();
const username = (await prisma.gitHub.findFirst())?.data?.username || '';
await prisma.$disconnect();

// ── settings ──
add(['gitHub', 'config'], 'GET', '/api/github/config', 'admin', { expect: 200 });
add(['gitHub', 'config'], 'GET', '/api/github/config', 'visitor', { auth: 'anon', expect: 200 });
add(['gitHub'], 'GET', '/api/github/config', 'no row', { setup: (p) => p.gitHub.deleteMany(), expect: 200 });
add(['gitHub', 'config'], 'PUT', '/api/github/config', 'settings', { body: { username: 'someone', enabled: false, includePrivate: true, sections: { repos: false }, hiddenRepos: ['a'], other: 1 }, expect: 200 });
add(['gitHub', 'config'], 'PUT', '/api/github/config', 'first save', { setup: (p) => p.gitHub.deleteMany(), body: { username: 'x' }, expect: 200 });
add(['gitHub', 'config'], 'PUT', '/api/github/config', 'secrets', { body: { githubToken: 'ghp_x', webhookSecret: '  hush ' }, expect: 200 });
add(['gitHub', 'config'], 'PUT', '/api/github/config', 'clear secrets', { setup: secrets({ encryptedGithubToken: encrypt('t'), encryptedGithubWebhookSecret: encrypt('s') }), body: { githubToken: '', webhookSecret: '' }, expect: 200 });
add(['gitHub', 'config'], 'PUT', '/api/github/config', 'bad username', { body: { username: 5 }, expect: 400 });
add(['gitHub', 'config'], 'PUT', '/api/github/config', 'bad webhook secret', { body: { webhookSecret: 5 }, expect: 400 });
add(['gitHub'], 'PUT', '/api/github/config', 'null body', { body: 'null', ignore: ['error'], expect: 500 });
add(['gitHub'], 'PUT', '/api/github/config', 'anonymous', { auth: 'anon', body: {}, expect: 401 });

// ── sync refusals ──
add(['project'], 'GET', '/api/github/sync', 'nothing selected', { expect: 400 });
add(['project'], 'GET', '/api/github/sync?repo=other/x', 'foreign owner', { expect: 400 });
add(['project', 'gitHub'], 'POST', '/api/github/sync', 'no username', { setup: (p) => p.gitHub.deleteMany(), body: { repo: 'x' }, expect: 400 });
add(['project'], 'POST', '/api/github/sync', 'not JSON', { body: '{oops', expect: 400 });
add(['project'], 'POST', '/api/github/sync', 'too many', { body: { repos: Array.from({ length: 31 }, (_, i) => `r${i}`) }, expect: 400 });
add(['project'], 'POST', '/api/github/sync', 'anonymous', { auth: 'anon', body: {}, expect: 401 });
add(['project'], 'GET', '/api/github/sync?repo=x', 'anonymous preview', { auth: 'anon', expect: 401 });

// ── webhook ──
const SECRET = 'wp-hook';
const withSecret = secrets({ encryptedGithubWebhookSecret: encrypt(SECRET) });
const hook = (name, event, body, expect, extra = {}) => add(['config', 'project'], 'POST', '/api/github/webhook', name, {
    auth: 'anon', setup: withSecret, body, expect,
    headers: { 'x-github-event': event, 'x-hub-signature-256': `sha256=${createHmac('sha256', SECRET).update(body).digest('hex')}` },
    ...extra,
});
add(['config'], 'POST', '/api/github/webhook', 'no secret configured', { auth: 'anon', setup: secrets({ encryptedGithubWebhookSecret: null }), body: '{}', expect: 503 });
add(['config'], 'POST', '/api/github/webhook', 'unsigned', { auth: 'anon', setup: withSecret, body: '{}', expect: 401 });
add(['config'], 'POST', '/api/github/webhook', 'wrong signature', { auth: 'anon', setup: withSecret, body: '{}', headers: { 'x-hub-signature-256': 'sha256=00' }, expect: 401 });
hook('ping', 'ping', '{"zen":"é"}', 200);
hook('other event', 'issues', '{}', 200);
hook('bad payload', 'push', 'nope', 400);
hook('no repository', 'push', '{}', 200);
hook('not linked', 'push', '{"repository":{"full_name":"nobody/none"}}', 200);
// Queued, then the background sync fails (no such repo) and writes nothing.
const linked = async (p) => {
    await withSecret(p);
    await p.project.create({ data: { id: 'wp-linked', name: 'Linked', year: '2026', status: 'Working', projectType: 'Web', description: 'd', slug: 'wp-linked', source: 'github', repoFullName: 'Nobody-wp/None', createdAt: PAST, updatedAt: PAST } });
};
hook('linked repo is queued', 'push', '{"repository":{"full_name":"nobody-wp/none"}}', 202, { setup: linked });

export default cases;
export { username };
