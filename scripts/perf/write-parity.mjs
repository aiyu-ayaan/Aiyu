#!/usr/bin/env node
// Parity of the admin writes ported to Rust: each case runs against Next (reference), then against Rust, from the
// same database state. Compared: status, content type, cache headers, body, and every row the call added, removed or
// changed in the watched tables. The tables are put back after every run.
// IT WRITES TO THE DATABASE IN DATABASE_URL: local databases only.
// Rust must trust the loopback peer (TRUSTED_PROXIES=127.0.0.1).
// Usage: node --env-file=.env scripts/perf/write-parity.mjs [--next http://127.0.0.1:3100] [--rust http://127.0.0.1:8080]
//          [--only <substring>] scripts/perf/writes/<group>.mjs ...
import { randomInt } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PrismaClient, Prisma } from '@prisma/client';
import { BEARER } from './writes/_shared.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const files = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
const SERVERS = { next: opt('next', 'http://127.0.0.1:3100'), rust: opt('rust', 'http://127.0.0.1:8080') };
const only = opt('only', '');

const host = new URL(process.env.DATABASE_URL).hostname;
if (!['localhost', '127.0.0.1', '::1'].includes(host)) throw new Error(`refusing to write to ${host}: local databases only`);
const prisma = new PrismaClient();

let requests = 0;
const address = () => `198.51.${randomInt(1, 250)}.${(requests++ % 250) + 1}`;

async function login() {
    const form = new FormData();
    form.set('username', process.env.ADMIN_USERNAME || '');
    form.set('password', process.env.ADMIN_PASSWORD || '');
    const res = await fetch(`${SERVERS.next}/api/auth/login`, { method: 'POST', body: form, headers: { 'x-real-ip': address(), 'user-agent': 'write-parity' } });
    const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('session='));
    if (!cookie) throw new Error(`login failed (${res.status})`);
    return cookie;
}

const jsonFields = (model) => Prisma.dmmf.datamodel.models.find((m) => m.name.toLowerCase() === model.toLowerCase()).fields.filter((f) => f.type === 'Json' && !f.isRequired).map((f) => f.name);
const writable = (model, row) => ({ ...row, ...Object.fromEntries(jsonFields(model).filter((f) => row[f] === null).map((f) => [f, Prisma.DbNull])) });

async function snapshot(models) {
    const out = {};
    for (const model of models) out[model] = new Map((await prisma[model].findMany()).map((r) => [r.id, r]));
    return out;
}

async function restore(models, saved) {
    const now = await snapshot(models);
    // Children are listed after their parents: remove them first, add parents first.
    for (const model of [...models].reverse()) {
        for (const id of now[model].keys()) if (!saved[model].has(id)) await prisma[model].deleteMany({ where: { id } });
    }
    for (const model of models) {
        for (const [id, row] of saved[model]) {
            const current = (await prisma[model].findUnique({ where: { id } }));
            if (!current) await prisma[model].create({ data: writable(model, row) });
            else if (!isDeepStrictEqual(current, row)) await prisma[model].update({ where: { id }, data: writable(model, row) });
        }
    }
}

// Ids and times that differ between the two runs: ids the call created, and timestamps taken during it.
function normalizer(known, since) {
    const ids = new Map();
    return function normalize(value) {
        if (value instanceof Date) value = value.toISOString();
        if (typeof value === 'string') {
            if (/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(value) && Date.parse(value) >= since) return '<now>';
            if (/^c[0-9a-z]{24}$/.test(value) && !known.has(value)) {
                if (!ids.has(value)) ids.set(value, `<new ${ids.size + 1}>`);
                return ids.get(value);
            }
            return value;
        }
        if (Array.isArray(value)) return value.map(normalize);
        if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v)]));
        return value;
    };
}

function changes(models, before, after) {
    const out = [];
    for (const model of models) {
        for (const [id, row] of after[model]) {
            const old = before[model].get(id);
            if (!old) out.push({ model, added: row });
            else if (!isDeepStrictEqual(old, row)) {
                const keys = Object.keys(row).filter((k) => !isDeepStrictEqual(old[k], row[k]));
                out.push({ model, changed: id, to: Object.fromEntries(keys.map((k) => [k, row[k]])) });
            }
        }
        for (const id of before[model].keys()) if (!after[model].has(id)) out.push({ model, removed: id });
    }
    // Postgres returns rows in no fixed order, and new ids differ between runs: sort new rows by their content.
    const content = ({ id: _id, categoryId: _category, createdAt: _created, updatedAt: _updated, ...rest }) => JSON.stringify(rest);
    const key = (c) => `${c.model} ${c.changed ?? c.removed ?? content(c.added)}`;
    return out.sort((a, b) => key(a).localeCompare(key(b)));
}

const HEADERS = ['content-type', 'cache-control', 'cdn-cache-control'];

async function run(server, test, cookie) {
    const saved = await snapshot(test.models);
    try {
        await test.setup?.(prisma);
        const before = await snapshot(test.models);
        const known = new Set(Object.values(before).flatMap((m) => [...m.keys()]));
        const since = Date.now() - 5;
        const headers = { 'x-real-ip': address(), 'user-agent': 'write-parity', 'content-type': 'application/json', ...test.headers };
        if (test.auth !== 'anon' && test.auth !== 'bearer') headers.cookie = cookie;
        if (test.auth === 'bearer') headers.authorization = `Bearer ${BEARER}`;
        const raw = typeof test.body === 'function' ? await test.body(prisma) : test.body;
        const body = raw === undefined || typeof raw === 'string' ? raw : JSON.stringify(raw);
        const res = await fetch(SERVERS[server] + test.path, { method: test.method, headers, body, redirect: 'manual' });
        const text = await res.text();
        let parsed = text;
        try { parsed = JSON.parse(text); } catch { /* not JSON */ }
        for (const key of test.ignore ?? []) if (parsed && typeof parsed === 'object') delete parsed[key];
        const after = await snapshot(test.models);
        const normalize = normalizer(known, since);
        return normalize({ status: res.status, headers: Object.fromEntries(HEADERS.map((h) => [h, res.headers.get(h)])), body: parsed, db: changes(test.models, before, after) });
    } finally {
        await restore(test.models, saved);
    }
}

const cookie = await login();
let failed = 0;
let total = 0;
for (const file of files) {
    const { default: cases } = await import(pathToFileURL(resolve(file)));
    for (const test of cases) {
        const name = `${test.method} ${test.path} - ${test.name}`;
        if (only && !name.includes(only)) continue;
        total++;
        const next = await run('next', test, cookie);
        const rust = await run('rust', test, cookie);
        const wrong = ['status', 'headers', 'body', 'db'].filter((k) => !isDeepStrictEqual(next[k], rust[k]));
        // A case that is meant to write must write, or two matching failures would pass.
        if (!wrong.length && test.expect && next.status !== test.expect) wrong.push('expect');
        if (!wrong.length) {
            console.log(`ok   ${name} [${next.status}, ${next.db.length} row changes]`);
            continue;
        }
        failed++;
        console.log(`FAIL ${name}`);
        for (const k of wrong) console.log(`  ${k}\n    next ${JSON.stringify(k === 'expect' ? next.status : next[k]).slice(0, 700)}\n    rust ${JSON.stringify(k === 'expect' ? test.expect : rust[k]).slice(0, 700)}`);
    }
}
await prisma.session.deleteMany({ where: { userAgent: 'write-parity' } });
await prisma.auditLog.deleteMany({ where: { userAgent: 'write-parity' } });
await prisma.$disconnect();
console.log(`${total - failed}/${total} equal`);
process.exit(failed ? 1 : 0);
