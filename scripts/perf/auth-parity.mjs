#!/usr/bin/env node
// Parity of the write routes ported with auth: login, logout and analytics/track, against Next (reference) and Rust.
// It signs in for real and writes Session, AuditLog and Analytics rows: run it against a local database only.
// Rust must trust the loopback peer (TRUSTED_PROXIES=127.0.0.1) so both servers see the same client address.
// Usage: node --env-file=.env scripts/perf/auth-parity.mjs [--next http://127.0.0.1:3100] [--rust http://127.0.0.1:8080]
import { randomInt } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { PrismaClient } from '@prisma/client';

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const NEXT = opt('next', 'http://127.0.0.1:3100');
const RUST = opt('rust', 'http://127.0.0.1:8080');
const prisma = new PrismaClient();

// A fresh address and user agent per run: the rate limits start empty and the rows are easy to find.
const RUN = `parity-${Date.now()}`;
const IP = `203.0.${randomInt(1, 250)}.${randomInt(1, 250)}`;
const HEADERS = ['content-type', 'cache-control', 'x-ratelimit-limit', 'x-ratelimit-remaining'];
let failures = 0;
const check = (name, ok, detail = '') => {
    if (!ok) failures++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` ${detail}`}`);
};
const same = (name, a, b) => check(name, isDeepStrictEqual(a, b), `\n  next ${JSON.stringify(a)}\n  rust ${JSON.stringify(b)}`);

const normalizeCookie = (c) => c?.replace(/session=ey[^;]*/, 'session=<jwt>').replace(/Expires=(?!Thu, 01 Jan 1970)[^;]*/, 'Expires=<date>') ?? null;
const claims = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

async function call(base, path, { method = 'POST', body, headers = {}, ip = IP, ua = RUN } = {}) {
    const res = await fetch(base + path, { method, body, redirect: 'manual', headers: { 'x-real-ip': ip, 'x-forwarded-for': ip, 'user-agent': ua, ...headers } });
    const text = await res.text();
    const setCookie = res.headers.getSetCookie()[0];
    return {
        token: setCookie?.match(/session=(ey[^;]*)/)?.[1],
        seen: { status: res.status, headers: Object.fromEntries(HEADERS.map((h) => [h, res.headers.get(h)])), cookie: normalizeCookie(setCookie), body: text },
    };
}

const form = (fields, Type = FormData) => {
    const f = new Type();
    for (const [k, v] of Object.entries(fields)) f.append(k, v);
    return f;
};
const good = { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD };
const both = async (name, path, options) => {
    const next = await call(NEXT, path, options?.(NEXT) ?? {});
    const rust = await call(RUST, path, options?.(RUST) ?? {});
    same(name, next.seen, rust.seen);
    return { next, rust };
};

// ── login ──
await both('login: wrong password (multipart)', '/api/auth/login', () => ({ body: form({ ...good, password: 'wrong' }) }));
await both('login: wrong username (urlencoded)', '/api/auth/login', () => ({ body: form({ username: 'nobody "x"', password: 'wrong' }, URLSearchParams) }));
await both('login: not a form', '/api/auth/login', () => ({ body: '{}', headers: { 'content-type': 'application/json' } }));
const ok = await both('login: success', '/api/auth/login', () => ({ body: form(good) }));
const withEmail = await both('login: success with email', '/api/auth/login', () => ({ body: form({ ...good, email: 'a@example.test' }, URLSearchParams) }));
await both('login: sixth attempt is limited', '/api/auth/login', () => ({ body: form(good) }));
for (const [name, pair] of [['claims', ok], ['claims with email', withEmail]]) {
    const [a, b] = [claims(pair.next.token), claims(pair.rust.token)];
    const shape = (c) => ({ keys: Object.keys(c), user: c.user, ttl: c.exp - c.iat, jti: /^[0-9a-f]{8}-[0-9a-f]{4}-4/.test(c.jti), expires: /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(c.expires) });
    same(name, shape(a), shape(b));
}

// ── the sessions work on both servers ──
const status = async (base, path, token) => (await fetch(base + path, { headers: { cookie: `session=${token}` } })).status;
const NEXT_ADMIN = '/api/admin/security/sessions';
const RUST_ADMIN = '/api/legal/apps';
for (const [name, token] of [['Next', ok.next.token], ['Rust', ok.rust.token]]) {
    check(`${name} session accepted by Next`, (await status(NEXT, NEXT_ADMIN, token)) === 200);
    check(`${name} session accepted by Rust`, (await status(RUST, RUST_ADMIN, token)) === 200);
}

// ── logout ──
await both('logout', '/api/auth/logout', (base) => ({ headers: { cookie: `session=${base === NEXT ? ok.next.token : ok.rust.token}` } }));
check('Rust logout revokes for Next', (await status(NEXT, NEXT_ADMIN, ok.rust.token)) === 401);
check('Rust logout revokes for Rust', (await status(RUST, RUST_ADMIN, ok.rust.token)) === 401);
await both('logout without a cookie', '/api/auth/logout');

const pick = ({ action, category, details, ipAddress }) => ({ action, category, details, ipAddress });
const audits = (await prisma.auditLog.findMany({ where: { userAgent: RUN }, orderBy: { createdAt: 'asc' } })).map(pick);
// Calls alternate Next, Rust.
same('audit rows', audits.filter((_, i) => i % 2 === 0), audits.filter((_, i) => i % 2 === 1));
check('audit rows written', audits.length >= 12, `found ${audits.length}`);
const sessions = await prisma.session.findMany({ where: { userAgent: RUN }, orderBy: { createdAt: 'asc' } });
const session = (s) => ({ label: s.label, ip: s.ipAddress, revoked: !!s.revokedAt, ttl: Math.round((s.expiresAt - s.createdAt) / 60000), seen: Math.abs(s.lastSeenAt - s.createdAt) < 60000 });
same('session rows', sessions.filter((_, i) => i % 2 === 0).map(session), sessions.filter((_, i) => i % 2 === 1).map(session));

// ── analytics ──
// A probe entity id keeps the rows apart from real views; they are deleted below.
const entityId = RUN;
const beacon = {
    type: 'entity_view', path: `/blogs/${'é😀'.repeat(600)}`, entityType: 'blog', entityId, entitySlug: 12,
    referrer: 'https://www.Google.com/search?q=private', sessionId: 's1', meta: { target: 'x', n: [1, null] },
};
const sendAll = async (name, body, ua, extra = {}) => {
    await both(name, '/api/analytics/track', () => ({ body, ua, headers: { 'content-type': 'text/plain', ...extra } }));
};
const AGENTS = [
    ['Mozilla/5.0 (Linux; Android 14; SM-X700) Safari', { 'cf-ipcountry': 'in' }],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile', { 'cf-ipcountry': 'us' }],
    ['curl/8.0', {}],
];
const started = new Date();
for (const [agent, extra] of AGENTS) await sendAll(`track: ${agent.slice(0, 20)}`, JSON.stringify(beacon), `${agent} ${RUN}`, extra);
await sendAll('track: bad JSON', '{oops', `bad ${RUN}`);
await sendAll('track: array payload', '[1]', `array ${RUN}`);
await sendAll('track: null payload', 'null', `null ${RUN}`);
await both('track: signed in', '/api/analytics/track', () => ({ body: JSON.stringify(beacon), ua: `admin ${RUN}`, headers: { cookie: `session=${withEmail.rust.token}` } }));

// Each pair of rows (Next, then Rust) must be identical: the visitor hash included.
const events = await prisma.analyticsEvent.findMany({ where: { createdAt: { gte: started } }, orderBy: { createdAt: 'asc' } });
const row = ({ id: _id, createdAt: _at, ...rest }) => rest;
check('event rows written', events.length === 10, `found ${events.length}, want 10`);
for (let i = 0; i + 1 < events.length; i += 2) same(`event row ${i / 2 + 1} (${events[i].device})`, row(events[i]), row(events[i + 1]));
const daily = await prisma.analyticsDaily.findMany({ where: { entityId } });
same('daily rollup: 6 views, 3 uniques', [[6, 3]], daily.map((d) => [d.views, d.uniques]));

// Remove what the run added to the visitor statistics.
for (const e of events) {
    const bucket = { day: e.createdAt.toISOString().slice(0, 10), type: e.type, entityType: '', entityId: '' };
    await prisma.analyticsDaily.updateMany({ where: bucket, data: { views: { decrement: 1 } } });
}
for (const hash of new Set(events.map((e) => `${e.type} ${e.visitorHash}`))) {
    const [type] = hash.split(' ');
    await prisma.analyticsDaily.updateMany({ where: { type, entityType: '', entityId: '', day: started.toISOString().slice(0, 10) }, data: { uniques: { decrement: 1 } } });
}
await prisma.analyticsDaily.deleteMany({ where: { OR: [{ entityId }, { views: { lte: 0 } }] } });
await prisma.analyticsEvent.deleteMany({ where: { id: { in: events.map((e) => e.id) } } });
await prisma.session.deleteMany({ where: { userAgent: RUN } });
await prisma.auditLog.deleteMany({ where: { userAgent: RUN } });
await prisma.$disconnect();
console.log(failures ? `${failures} failed` : 'all equal');
process.exit(failures ? 1 : 0);
