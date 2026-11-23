#!/usr/bin/env node
// Memory + latency bench used for every migration milestone (see development/docs/PERFORMANCE.md).
// Usage: node --env-file=.env scripts/perf/bench.mjs --url http://localhost:3100 --pid <server pid> [--backups 5] [--out file.json]
// Reports RSS of --pid (and its children) at idle, after a public-route warmup, and after each backup export.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, all) => (cur.startsWith('--') ? [...acc, [cur.slice(2), all[i + 1]]] : acc), []),
);
const base = args.url || 'http://localhost:3100';
const pid = Number(args.pid);
const backups = Number(args.backups || 5);
if (!pid) throw new Error('--pid is required');

// RSS of a process tree in MB, read from /proc so the bench needs no extra deps.
function rssMb(root) {
  const children = new Map();
  for (const d of readdirSync('/proc')) {
    if (!/^\d+$/.test(d)) continue;
    try {
      const ppid = Number(readFileSync(`/proc/${d}/stat`, 'utf8').split(') ')[1].split(' ')[1]);
      if (!children.has(ppid)) children.set(ppid, []);
      children.get(ppid).push(Number(d));
    } catch { /* process exited */ }
  }
  let kb = 0;
  const stack = [root];
  while (stack.length) {
    const p = stack.pop();
    try {
      const m = readFileSync(`/proc/${p}/status`, 'utf8').match(/VmRSS:\s+(\d+)/);
      if (m) kb += Number(m[1]);
    } catch { /* gone */ }
    stack.push(...(children.get(p) || []));
  }
  return Math.round(kb / 1024);
}

const PUBLIC_ROUTES = ['/', '/about-me', '/blogs', '/projects', '/gallery', '/apps', '/github', '/contact-us', '/ai', '/desktop', '/games', '/sitemap.xml', '/robots.txt', '/api/config'];

async function timed(path, init) {
  const t = performance.now();
  const res = await fetch(base + path, { redirect: 'manual', ...init });
  const buf = await res.arrayBuffer();
  return { status: res.status, ms: performance.now() - t, bytes: buf.byteLength };
}

const report = { url: base, date: new Date().toISOString(), rss: {}, routes: {}, backups: [] };
report.rss.idle = rssMb(pid);

for (const r of PUBLIC_ROUTES) {
  const samples = [];
  for (let i = 0; i < 10; i++) samples.push(await timed(r));
  const ms = samples.map((s) => s.ms).sort((a, b) => a - b);
  report.routes[r] = { status: samples[0].status, bytes: samples[0].bytes, p50: +ms[5].toFixed(1), p90: +ms[9].toFixed(1) };
}
report.rss.afterPublicWarmup = rssMb(pid);

const form = new FormData();
form.set('username', process.env.ADMIN_USERNAME || '');
form.set('password', process.env.ADMIN_PASSWORD || '');
const login = await fetch(base + '/api/auth/login', { method: 'POST', body: form, redirect: 'manual' });
const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
if (!login.ok || !cookie) {
  report.backups = `login failed (${login.status}); backup bench skipped`;
} else {
  for (let i = 0; i < backups; i++) {
    const r = await timed('/api/admin/export', { headers: { cookie } });
    report.backups.push({ run: i + 1, status: r.status, zipMb: +(r.bytes / 1048576).toFixed(1), ms: Math.round(r.ms), rssMb: rssMb(pid) });
  }
}
await new Promise((r) => setTimeout(r, 5000));
report.rss.after5sSettle = rssMb(pid);

console.log(JSON.stringify(report, null, 2));
if (args.out) writeFileSync(args.out, JSON.stringify(report, null, 2));
