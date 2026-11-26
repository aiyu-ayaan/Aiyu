// Cron jobs, their secrets, logs, template previews and "run now" webhook execution.
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { PAST } from './_shared.mjs';

const cases = [];
const add = (models, method, path, name, rest = {}) => cases.push({ models, method, path, name, ...rest });
const anon = (models, method, path) => add(models, method, path, 'anonymous', { auth: 'anon', body: method === 'GET' ? undefined : {}, expect: 401 });

const encrypt = (text) => {
    const iv = randomBytes(16);
    const key = createHash('sha256').update(String(process.env.JWT_SECRET)).digest('base64').substring(0, 32);
    const cipher = createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    return `${iv.toString('hex')}:${Buffer.concat([cipher.update(text), cipher.final()]).toString('hex')}`;
};

let captured = [];
let sinkReply = 200;
const listener = createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
        captured.push({
            method: req.method,
            url: req.url,
            auth: req.headers.authorization || '',
            ua: req.headers['user-agent'] || '',
            ct: req.headers['content-type'] || '',
            body: Buffer.concat(chunks).toString().replace(/\d{4}-\d\d-\d\dT[\d:.]+Z/g, '<time>'),
        });
        setTimeout(() => {
            res.writeHead(sinkReply, { 'content-type': 'application/json' }).end(sinkReply === 200 ? '{"received":true}' : '{"error":"boom"}');
        }, 5);
    });
});
await new Promise((r) => listener.listen(0, '127.0.0.1', r));
listener.unref();
const sinkPort = listener.address().port;
const sink = `http://127.0.0.1:${sinkPort}`;

const seedJobs = async (p) => {
    await p.cron.deleteMany();
    await p.cron.create({
         data: {
            id: 'wp-user-cron',
            name: 'WP User Webhook',
            type: 'user',
            schedule: '15 4 * * *',
            enabled: true,
            action: 'webhook',
            webhookUrl: 'https://example.org/hook',
            webhookUrlType: 'fixed',
            webhookMethod: 'POST',
            webhookHeaders: [{ key: 'X-Custom', value: '1' }],
            webhookHeadersType: 'fixed',
            webhookBody: '{"a":1}',
            webhookBodyType: 'fixed',
            webhookEnv: [{ key: 'K', value: encrypt('secret-val') }, { key: 'EMPTY', value: '' }],
            nextRun: new Date(Date.now() + 3600_000),
            createdAt: PAST,
            updatedAt: PAST,
        },
    });
    await p.cron.create({
        data: {
            id: 'wp-stale-cron',
            name: 'WP Stale Webhook',
            type: 'user',
            schedule: '30 5 * * *',
            enabled: true,
            action: 'webhook',
            webhookUrl: 'https://example.org/stale',
            nextRun: PAST,
            createdAt: PAST,
            updatedAt: PAST,
        },
    });
    await p.cron.create({
        data: {
            id: 'wp-sys-cron',
            name: 'WP System Job',
            type: 'system',
            schedule: '0 2 * * *',
            enabled: false,
            action: 'prune_sessions',
            nextRun: null,
            createdAt: PAST,
            updatedAt: PAST,
        },
    });
};

// ── list & self-heal ──
add(['cron'], 'GET', '/api/admin/crons', 'list and heal stale nextRun', { setup: seedJobs, expect: 200 });
anon(['cron'], 'GET', '/api/admin/crons');

// ── create ──
add(['cron'], 'POST', '/api/admin/crons', 'create fixed webhook', {
    body: {
        name: 'New Hook',
        schedule: '0 6 * * *',
        webhookUrl: 'https://example.org/new',
        webhookHeaders: [{ key: 'X-A', value: 'b' }],
        webhookBody: '{"hello":"world"}',
        webhookEnv: [{ key: 'TOK', value: 'my-secret' }, { key: 'BLANK', value: '' }],
        notificationEnabled: true,
        notificationOn: 'failure',
        retryEnabled: true,
        retryType: 'exponential',
        retryCount: 2,
        retryDelay: 30,
    },
    expect: 201,
});
add(['cron'], 'POST', '/api/admin/crons', 'auto-detect expression mode', {
    body: {
        name: 'Dynamic Hook',
        schedule: '*/10 * * * *',
        webhookUrl: 'https://example.org/$env.PATH_VAR',
        webhookMethod: 'GET',
        webhookHeaders: [{ key: 'Authorization', value: 'Bearer $env.TOK' }],
        webhookBody: '$blogs.0.title',
    },
    expect: 201,
});
add(['cron'], 'POST', '/api/admin/crons', 'missing required fields', { body: { name: 'Only Name' }, expect: 400 });
add(['cron'], 'POST', '/api/admin/crons', 'invalid schedule fields', {
    body: { name: 'Bad Sched', schedule: '0 0 * *', webhookUrl: 'https://example.org' },
    expect: 400,
});
anon(['cron'], 'POST', '/api/admin/crons');

// ── update ──
add(['cron'], 'PUT', '/api/admin/crons/wp-user-cron', 'update user job and schedule', {
    setup: seedJobs,
    body: {
        name: 'Renamed Hook',
        schedule: '45 7 * * *',
        webhookUrl: 'https://example.org/$time',
        webhookMethod: 'GET',
        webhookHeaders: [{ key: 'X-New', value: 'val' }],
        webhookBody: 'plain',
        webhookEnv: [{ key: 'K2', value: 'v2' }],
        retryEnabled: true,
        retryCount: 4,
    },
    expect: 200,
});
add(['cron'], 'PUT', '/api/admin/crons/wp-user-cron', 'disable clears nextRun', {
    setup: seedJobs,
    body: { enabled: false },
    expect: 200,
});
add(['cron'], 'PUT', '/api/admin/crons/wp-sys-cron', 'system job ignores name and webhook fields', {
    setup: seedJobs,
    body: {
        name: 'Attempted Rename',
        enabled: true,
        schedule: '20 3 * * *',
        webhookUrl: 'https://evil.example.org',
        notificationEnabled: true,
        notificationOn: 'failure',
    },
    expect: 200,
});
add(['cron'], 'PUT', '/api/admin/crons/wp-user-cron', 'invalid schedule on update', {
    setup: seedJobs,
    body: { schedule: 'invalid' },
    expect: 400,
});
add(['cron'], 'PUT', '/api/admin/crons/wp-missing-cron', 'not found', {
    body: { enabled: false },
    expect: 404,
});
anon(['cron'], 'PUT', '/api/admin/crons/wp-user-cron');

// ── delete ──
add(['cron'], 'DELETE', '/api/admin/crons/wp-user-cron', 'delete user job', { setup: seedJobs, expect: 200 });
add(['cron'], 'DELETE', '/api/admin/crons/wp-sys-cron', 'forbid deleting system job', { setup: seedJobs, expect: 403 });
add(['cron'], 'DELETE', '/api/admin/crons/wp-missing-cron', 'delete missing job', { expect: 404 });
anon(['cron'], 'DELETE', '/api/admin/crons/wp-user-cron');

// ── global env secrets ──
add(['cronEnv'], 'GET', '/api/admin/crons/env', 'read existing or seed empty', { expect: 200 });
add(['cronEnv'], 'GET', '/api/admin/crons/env', 'seed when missing', { setup: (p) => p.cronEnv.deleteMany(), expect: 200 });
add(['cronEnv'], 'POST', '/api/admin/crons/env', 'save encrypted secrets', {
    body: { env: [{ key: 'API_KEY', value: 'top-secret' }, { key: 'EMPTY_KEY', value: '' }] },
    expect: 200,
});
add(['cronEnv'], 'POST', '/api/admin/crons/env', 'read back decrypted secrets', {
    setup: async (p) => {
        await p.cronEnv.deleteMany();
        await p.cronEnv.create({
            data: { id: 'wp-cenv', data: { env: [{ key: 'A', value: encrypt('alpha') }] }, createdAt: PAST, updatedAt: PAST },
        });
    },
    body: { env: [{ key: 'A', value: 'alpha-updated' }] },
    expect: 200,
});
anon(['cronEnv'], 'GET', '/api/admin/crons/env');
anon(['cronEnv'], 'POST', '/api/admin/crons/env');

// ── logs ──
const seedLogs = async (p) => {
    await seedJobs(p);
    await p.cronLog.deleteMany();
    const entries = [
        ['wp-log-1', 'wp-user-cron', 'WP User Webhook', 'webhook', 'success', 'POST', 'https://example.org/hook', 'HTTP 200 OK', 120, 1000],
        ['wp-log-2', 'wp-user-cron', 'WP User Webhook', 'webhook', 'failure', 'POST', 'https://example.org/fail', 'Connection timeout', 5000, 2000],
        ['wp-log-3', 'wp-sys-cron', 'WP System Job', 'prune_sessions', 'success', '', '', 'Deleted 3 sessions (100% clean)', 15, 3000],
    ];
    for (const [id, cronId, cronName, action, status, method, url, log, durationMs, offset] of entries) {
        const ranAt = new Date(PAST.getTime() + offset);
        await p.cronLog.create({
            data: { id, cronId, cronName, action, status, method, url, log, durationMs, ranAt, createdAt: ranAt, updatedAt: ranAt },
        });
    }
};
add(['cron', 'cronLog'], 'GET', '/api/admin/crons/logs', 'default page', { setup: seedLogs, expect: 200 });
add(['cron', 'cronLog'], 'GET', '/api/admin/crons/logs?page=1&limit=2', 'paginated', { setup: seedLogs, expect: 200 });
add(['cron', 'cronLog'], 'GET', '/api/admin/crons/logs?status=failure', 'filter by status', { setup: seedLogs, expect: 200 });
add(['cron', 'cronLog'], 'GET', '/api/admin/crons/logs?cronId=wp-sys-cron', 'filter by cronId', { setup: seedLogs, expect: 200 });
add(['cron', 'cronLog'], 'GET', '/api/admin/crons/logs?search=timeout', 'search log text', { setup: seedLogs, expect: 200 });
add(['cron', 'cronLog'], 'GET', '/api/admin/crons/logs?search=100%25', 'search literal percent', { setup: seedLogs, expect: 200 });
anon(['cronLog'], 'GET', '/api/admin/crons/logs');

// ── preview ──
add(['blog', 'project'], 'POST', '/api/admin/crons/preview', 'string template with env and site', {
    body: { template: 'Site: $site | Secret: $env.MY_TOKEN | Unknown: $nonexistent.foo' },
    expect: 200,
});
add(['blog'], 'POST', '/api/admin/crons/preview', 'object template with collection', {
    setup: async (p) => {
        await p.blog.create({
            data: { id: 'wp-prev-blog', title: 'Preview Post', slug: 'preview-post', content: 'Body', date: '2025-01-01', published: true, createdAt: new Date() },
        });
    },
    body: { template: { latestBlog: '$blogs.0.title', auth: 'Bearer $env.SECRET_KEY', count: '$blogs.length' } },
    expect: 200,
});
add([], 'POST', '/api/admin/crons/preview', 'empty template', { body: {}, expect: 200 });
add([], 'POST', '/api/admin/crons/preview', 'truncates over 50k chars', {
    body: { template: 'x'.repeat(55_000) },
    expect: 200,
});
anon([], 'POST', '/api/admin/crons/preview');

// ── manual run against local webhook listener ──
const setupRunHook = (status = 200, retryCount = 0) => async (p) => {
    captured = [];
    sinkReply = status;
    await p.cronEnv.deleteMany();
    await p.cronEnv.create({
        data: { id: 'wp-run-env', data: { env: [{ key: 'HOOK_TOK', value: encrypt('super-secret-hook-tok') }] }, createdAt: PAST, updatedAt: PAST },
    });
    await p.cron.create({
        data: {
            id: 'wp-run-cron',
            name: 'WP Run Webhook',
            type: 'user',
            schedule: '0 8 * * *',
            enabled: true,
            action: 'webhook',
            webhookUrl: `${sink}/hook?k=$env.HOOK_TOK`,
            webhookUrlType: 'expression',
            webhookMethod: 'POST',
            webhookHeaders: [{ key: 'Authorization', value: 'Bearer $env.HOOK_TOK' }],
            webhookHeadersType: 'expression',
            webhookBody: '{"site":"$site.url","secret":"$env.HOOK_TOK"}',
            webhookBodyType: 'expression',
            retryEnabled: retryCount > 0,
            retryType: 'stable',
            retryCount,
            retryDelay: 0,
            createdAt: PAST,
            updatedAt: PAST,
        },
    });
};

add(['cron', 'cronLog', 'cronEnv'], 'POST', '/api/admin/crons/wp-run-cron/run', 'run webhook job (200 OK & redact secret)', {
    setup: setupRunHook(200, 0),
    mask: ['durationMs'],
    check: (body, db) => {
        const logRow = db.find((c) => c.model === 'cronLog')?.added;
        return (
            captured.length === 1 &&
            captured[0].url === '/hook?k=super-secret-hook-tok' &&
            captured[0].auth === 'Bearer super-secret-hook-tok' &&
            captured[0].ua === 'Aiyu-Task-Scheduler' &&
            !body.data.lastRunLog.includes('super-secret-hook-tok') &&
            body.data.lastRunLog.includes('[SECRET: HOOK_TOK]') &&
            logRow?.status === 'success' &&
            !logRow?.url.includes('super-secret-hook-tok')
        );
    },
    expect: 200,
});

add(['cron', 'cronLog', 'cronEnv'], 'POST', '/api/admin/crons/wp-run-cron/run', 'run webhook job with retry on 500', {
    setup: setupRunHook(500, 1),
    mask: ['durationMs'],
    check: (body, db) => {
        const logRow = db.find((c) => c.model === 'cronLog')?.added;
        return (
            captured.length === 2 &&
            body.data.lastRunStatus === 'failure' &&
            body.data.lastRunLog.includes('--- Attempt 1 of 2 ---') &&
            body.data.lastRunLog.includes('--- Attempt 2 of 2 ---') &&
            logRow?.status === 'failure'
        );
    },
    expect: 200,
});

add(['cron'], 'POST', '/api/admin/crons/wp-missing-cron/run', 'missing job', { expect: 404 });
anon(['cron'], 'POST', '/api/admin/crons/wp-user-cron/run');

export default cases;
