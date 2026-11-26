#!/usr/bin/env node
// Parity of what the servers send outwards (contact form, notification test): both are pointed at a local listener,
// and the replies, the rows and the captured requests are compared. IT WRITES TO THE DATABASE IN DATABASE_URL:
// local databases only. Usage: node --env-file=.env scripts/perf/outbound-parity.mjs [--next url] [--rust url]
import { createServer } from 'node:http';
import { isDeepStrictEqual } from 'node:util';
import { PrismaClient } from '@prisma/client';

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const SERVERS = { next: opt('next', 'http://127.0.0.1:3100'), rust: opt('rust', 'http://127.0.0.1:8080') };
if (!['localhost', '127.0.0.1', '::1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('local databases only');
const prisma = new PrismaClient();

let captured = [];
let reply = 200;
const HEADERS = ['title', 'priority', 'tags', 'authorization', 'content-type', 'accept', 'user-agent'];
const listener = createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
        const headers = Object.fromEntries(HEADERS.filter((h) => req.headers[h] !== undefined).map((h) => [h, req.headers[h]]));
        // Each runtime names itself, and labels a plain string body its own way: neither is part of the message.
        if (/^(node|undici)/.test(headers['user-agent'] ?? '') || headers['user-agent'] === 'Portfolio-App') delete headers['user-agent'];
        if (headers.accept === '*/*') delete headers.accept;
        if (headers['content-type'] === 'text/plain;charset=UTF-8') delete headers['content-type'];
        const body = Buffer.concat(chunks).toString().replace(/\d{4}-\d\d-\d\dT[\d:.]+Z/g, '<time>');
        captured.push({ method: req.method, path: req.url, headers, body });
        res.writeHead(reply, { 'content-type': 'text/plain' }).end(reply === 200 ? 'ok' : 'refused');
    });
});
await new Promise((r) => listener.listen(0, '127.0.0.1', r));
const sink = `http://127.0.0.1:${listener.address().port}`;

const form = new FormData();
form.set('username', process.env.ADMIN_USERNAME || '');
form.set('password', process.env.ADMIN_PASSWORD || '');
const login = await fetch(`${SERVERS.next}/api/auth/login`, { method: 'POST', body: form, headers: { 'x-real-ip': '198.51.100.7', 'user-agent': 'outbound-parity' } });
const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('session='));

const config = await prisma.config.findFirst();
const notifications = await prisma.notificationConfig.findFirst();
let n = 0;
let failed = 0;
async function run(server, test) {
    captured = [];
    reply = test.reply ?? 200;
    const headers = { 'content-type': 'application/json', 'x-real-ip': `198.51.101.${++n % 250}` };
    if (!test.anonymous) headers.cookie = cookie;
    const res = await fetch(SERVERS[server] + test.path, { method: 'POST', headers, body: typeof test.body === 'string' ? test.body : JSON.stringify(test.body) });
    const body = await res.json().catch(() => null);
    const rows = await prisma.contactMessage.findMany({ where: { email: 'parity@example.org' }, select: { name: true, email: true, message: true, read: true } });
    await prisma.contactMessage.deleteMany({ where: { email: 'parity@example.org' } });
    captured.sort((a, b) => a.path.localeCompare(b.path));
    return { status: res.status, body: test.ignoreError ? { ...body, error: undefined } : body, rows, captured };
}

const channels = { ntfy: { enabled: true, serverUrl: `${sink}/`, topic: 'topic', token: 'tk' }, telegram: { enabled: false }, discord: { enabled: true, webhookUrl: `${sink}/discord` } };
const message = { name: 'Zoë', email: 'parity@example.org', message: 'Hello\nthere' };
const contact = '/api/contact/message';
const test = '/api/admin/notifications/test';
const cases = [
    { name: 'all channels and webhook', path: contact, body: message, sends: 3 },
    { name: 'services refuse', path: contact, body: message, reply: 500, sends: 3 },
    { name: 'notifications off', path: contact, body: message, off: true, sends: 1 },
    { name: 'plain ascii', path: contact, body: { ...message, name: 'Al' }, sends: 3 },
    { name: 'missing field', path: contact, body: { name: 'a' }, sends: 0 },
    { name: 'number field', path: contact, body: { ...message, name: 5 }, sends: 0 },
    { name: 'not JSON', path: contact, body: '{oops', sends: 0 },
    { name: 'test ntfy', path: test, body: { channel: 'ntfy', ntfy: { serverUrl: sink, topic: 't' } }, sends: 1 },
    { name: 'test ntfy refused', path: test, body: { channel: 'ntfy', ntfy: { serverUrl: sink, topic: 't', token: 'k' } }, reply: 403, sends: 1 },
    { name: 'test discord', path: test, body: { channel: 'discord', discord: { webhookUrl: `${sink}/d` } }, sends: 1 },
    { name: 'test discord refused', path: test, body: { channel: 'discord', discord: { webhookUrl: `${sink}/d` } }, reply: 400, sends: 1 },
    { name: 'test without topic', path: test, body: { channel: 'ntfy', ntfy: {} }, sends: 0 },
    { name: 'test telegram without chat', path: test, body: { channel: 'telegram', telegram: { botToken: 'x' } }, sends: 0 },
    { name: 'test discord without url', path: test, body: { channel: 'discord' }, sends: 0 },
    { name: 'test unknown channel', path: test, body: { channel: 'sms' }, sends: 0 },
    { name: 'test no channel', path: test, body: {}, ignoreError: true, sends: 0 },
    { name: 'test unreachable', path: test, body: { channel: 'discord', discord: { webhookUrl: 'http://127.0.0.1:1/' } }, sends: 0 },
    { name: 'test anonymous', path: test, body: {}, anonymous: true, sends: 0 },
];

try {
    await prisma.config.update({ where: { id: config.id }, data: { data: { ...config.data, n8nWebhookEnabled: true, n8nWebhookUrl: `${sink}/n8n`, n8nWebhookAuthKey: 'Bearer n8n' }, updatedAt: config.updatedAt } });
    for (const c of cases) {
        const data = { enabled: !c.off, notifyOnContactMessage: true, ...channels };
        await prisma.notificationConfig.update({ where: { id: notifications.id }, data: { data, updatedAt: notifications.updatedAt } });
        const next = await run('next', c);
        const rust = await run('rust', c);
        const wrong = ['status', 'body', 'rows', 'captured'].filter((k) => !isDeepStrictEqual(next[k], rust[k]));
        if (next.captured.length !== c.sends) wrong.push('captured');
        console.log(`${wrong.length ? 'FAIL' : 'ok  '} ${c.name} [${next.status}, ${next.captured.length} sent]`);
        for (const k of new Set(wrong)) console.log(`  ${k}\n    next ${JSON.stringify(next[k])}\n    rust ${JSON.stringify(rust[k])}`);
        failed += wrong.length ? 1 : 0;
    }
} finally {
    await prisma.config.update({ where: { id: config.id }, data: { data: config.data, updatedAt: config.updatedAt } });
    await prisma.notificationConfig.update({ where: { id: notifications.id }, data: { data: notifications.data, updatedAt: notifications.updatedAt } });
    await prisma.session.deleteMany({ where: { userAgent: 'outbound-parity' } });
    await prisma.auditLog.deleteMany({ where: { userAgent: 'outbound-parity' } });
    await prisma.$disconnect();
    listener.close();
}
console.log(`${cases.length - failed}/${cases.length} equal`);
process.exit(failed ? 1 : 0);
