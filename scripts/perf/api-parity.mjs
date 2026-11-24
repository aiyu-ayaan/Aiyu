#!/usr/bin/env node
// API parity check for the Rust port: the same requests against Next (reference) and Rust, signed out and signed in.
// Usage: node --env-file=.env scripts/perf/api-parity.mjs [--next http://localhost:3100] [--rust http://localhost:8080]
//          [--cookie-jar file] [--save baseline.json] [--only <substring>] <list file>
// List file: one request per line, `GET /api/about` (blank lines and # comments ignored).
// Compares status, content-type, cache headers and body (JSON deep-equal; other bodies by SHA-256).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const listFile = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--')).pop();
const NEXT = opt('next', 'http://localhost:3100');
const RUST = opt('rust', 'http://localhost:8080');
const jar = opt('cookie-jar', '');
const only = opt('only', '');

// Fields that legitimately differ per request.
const VOLATILE = new Set(['timestamp', 'uptime', 'responseTimeMs', 'generatedAt', 'serverTime']);
const HEADERS = ['content-type', 'cache-control', 'cdn-cache-control', 'access-control-allow-origin', 'location', 'content-disposition'];

function scrub(v) {
    if (Array.isArray(v)) return v.map(scrub);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => !VOLATILE.has(k)).map(([k, x]) => [k, scrub(x)]));
    return v;
}

async function cookieFor(base) {
    if (jar && existsSync(jar)) {
        const line = readFileSync(jar, 'utf8').split('\n').find((l) => l.includes('\tsession\t'));
        if (line) return `session=${line.split('\t').pop().trim()}`;
    }
    const form = new FormData();
    form.set('username', process.env.ADMIN_USERNAME || '');
    form.set('password', process.env.ADMIN_PASSWORD || '');
    const res = await fetch(`${base}/api/auth/login`, { method: 'POST', body: form, redirect: 'manual' });
    const c = (res.headers.getSetCookie?.() || []).map((x) => x.split(';')[0]).find((x) => x.startsWith('session='));
    if (!c) throw new Error(`login failed (${res.status})`);
    return c;
}

async function call(base, method, path, cookie) {
    const res = await fetch(base + path, { method, redirect: 'manual', headers: cookie ? { cookie } : {} });
    const buf = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get('content-type') || '';
    let body;
    if (type.includes('json')) {
        try { body = scrub(JSON.parse(buf.toString('utf8'))); } catch { body = `invalid json sha:${createHash('sha256').update(buf).digest('hex')}`; }
    } else {
        body = `sha:${createHash('sha256').update(buf).digest('hex')} len:${buf.length}`;
    }
    return { status: res.status, headers: Object.fromEntries(HEADERS.map((h) => [h, res.headers.get(h)])), body };
}

const requests = readFileSync(listFile, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split(/\s+/)).filter(([, p]) => !only || p.includes(only));
const cookie = await cookieFor(NEXT);
const saved = {};
let diffs = 0;
for (const [method, path] of requests) {
    for (const [who, c] of [['anon', null], ['admin', cookie]]) {
        const [a, b] = await Promise.all([call(NEXT, method, path, c), call(RUST, method, path, c)]);
        saved[`${who} ${method} ${path}`] = a;
        const problems = [];
        if (a.status !== b.status) problems.push(`status ${a.status} -> ${b.status}`);
        for (const h of HEADERS) if (a.headers[h] !== b.headers[h]) problems.push(`${h}: ${JSON.stringify(a.headers[h])} -> ${JSON.stringify(b.headers[h])}`);
        if (!isDeepStrictEqual(a.body, b.body)) {
            const sa = JSON.stringify(a.body), sb = JSON.stringify(b.body);
            let i = 0;
            while (i < sa.length && sa[i] === sb[i]) i++;
            problems.push(`body differs at ${i}: next ${sa.slice(Math.max(0, i - 60), i + 80)} | rust ${sb.slice(Math.max(0, i - 60), i + 80)}`);
        }
        if (problems.length) {
            diffs++;
            console.log(`DIFF ${who} ${method} ${path}\n  ${problems.join('\n  ')}`);
        }
    }
}
if (opt('save', '')) writeFileSync(opt('save'), JSON.stringify(saved, null, 2));
console.log(`${requests.length * 2 - diffs}/${requests.length * 2} equal`);
process.exit(diffs ? 1 : 0);
