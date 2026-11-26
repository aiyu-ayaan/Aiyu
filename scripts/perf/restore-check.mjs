#!/usr/bin/env node
// Restore round trip: export from a running server, empty a scratch database, restore into it, and compare every row
// of every backed-up table (and the upload files) with the source. The target database MUST be named *_scratch.
// Usage: node --env-file=.env scripts/perf/restore-check.mjs --source http://... --target http://... \
//          --target-db postgres://.../aiyu_scratch --target-uploads <dir> [--multipart]
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { PrismaClient } from '@prisma/client';

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const targetDb = opt('target-db', '');
if (!/_scratch(\?|$)/.test(targetDb)) throw new Error('--target-db must name a *_scratch database');
const source = new PrismaClient();
const target = new PrismaClient({ datasources: { db: { url: targetDb } } });
const MODELS = ['about', 'blog', 'config', 'gallery', 'header', 'home', 'aiPage', 'resumeStudio', 'aiSkillCategory', 'aiSkill', 'aiRecommendation', 'aiCredit', 'aiPrompt', 'project', 'deployment', 'legalApp', 'legalDocument', 'social', 'gitHub', 'contactMessage', 'theme', 'cron', 'ads', 'notificationConfig', 'analyticsEvent', 'analyticsDaily', 'aiLog'];

async function cookie(base) {
    const form = new FormData();
    form.set('username', process.env.ADMIN_USERNAME || '');
    form.set('password', process.env.ADMIN_PASSWORD || '');
    const res = await fetch(`${base}/api/auth/login`, { method: 'POST', body: form, headers: { 'x-real-ip': '198.51.100.21' } });
    return res.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('session='));
}

const exported = await fetch(`${opt('source')}/api/admin/export?includeGithub=true&includeContact=true&includeAiUsage=true`, { headers: { cookie: await cookie(opt('source')) } });
const zip = Buffer.from(await exported.arrayBuffer());
console.log(`export ${exported.status}, ${(zip.length / 1e6).toFixed(1)} MB`);

const auth = await cookie(opt('target'));
// Secrets a backup does not hold must survive the restore.
const marker = 'restore-check-token';
const config = await target.config.findFirst();
await target.config.update({ where: { id: config.id }, data: { encryptedGithubToken: marker } });
for (const model of [...MODELS].reverse()) if (model !== 'config') await target[model].deleteMany();

let body = zip;
const headers = { cookie: auth, 'content-type': 'application/zip', 'x-backup-filename': 'backup.zip' };
if (argv.includes('--multipart')) {
    body = new FormData();
    body.set('file', new File([zip], 'backup.zip', { type: 'application/zip' }));
    delete headers['content-type'];
}
const started = Date.now();
const res = await fetch(`${opt('target')}/api/admin/import`, { method: 'POST', headers, body });
const reply = await res.json();
console.log(`import ${res.status} in ${Date.now() - started} ms`);
if (!reply.success) console.log(JSON.stringify(reply));

let failed = res.status === 200 ? 0 : 1;
for (const model of MODELS) {
    // The export leaves a cron's secrets and run state out; sessions made here touch nothing else.
    const drop = { cron: ['webhookEnv', 'lastRun', 'lastRunStatus', 'lastRunLog'], config: ['encryptedGithubToken', 'encryptedGeminiApiKey', 'encryptedGroqApiKey', 'encryptedOpenRouterApiKey', 'blogApiTokenHash', 'updatedAt', 'createdAt'] }[model] ?? [];
    // Documents without their own dates in the backup get new ones.
    if (['about', 'header', 'home', 'gitHub'].includes(model)) drop.push('createdAt', 'updatedAt');
    const rows = async (db) => (await db[model].findMany({ orderBy: { id: 'asc' } })).map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !drop.includes(k) && k !== 'searchVector')));
    const [a, b] = [await rows(source), await rows(target)];
    const same = isDeepStrictEqual(a, b);
    if (!same) {
        failed++;
        const at = a.findIndex((r, i) => !isDeepStrictEqual(r, b[i]));
        console.log(`FAIL ${model}: ${a.length} source rows, ${b.length} restored; first difference ${JSON.stringify(a[at])?.slice(0, 300)} | ${JSON.stringify(b[at])?.slice(0, 300)}`);
    } else console.log(`ok   ${model} (${a.length})`);
}
const kept = (await target.config.findFirst()).encryptedGithubToken === marker;
console.log(`${kept ? 'ok  ' : 'FAIL'} a secret outside the backup survives`);
failed += kept ? 0 : 1;

const digest = async (dir) => Object.fromEntries(await Promise.all((await readdir(dir, { withFileTypes: true })).filter((f) => f.isFile()).map(async (f) => [f.name, createHash('sha256').update(await readFile(`${dir}/${f.name}`)).digest('hex')])));
const [files, restored] = [await digest(opt('source-uploads', 'public/uploads')), await digest(opt('target-uploads'))];
const missing = Object.keys(files).filter((f) => files[f] !== restored[f]);
console.log(`${missing.length ? 'FAIL' : 'ok  '} uploads (${Object.keys(files).length} files, ${missing.length} differ)`);
failed += missing.length ? 1 : 0;
await source.$disconnect();
await target.$disconnect();
process.exit(failed ? 1 : 0);
