#!/usr/bin/env node
// The Drive routes of aiyu-server against a local stand-in for Google. Start the server on a *_scratch database with
// GOOGLE_API_BASE_URL=http://127.0.0.1:8799, then: node --env-file=.env scripts/perf/drive-check.mjs --target url
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

const argv = process.argv.slice(2);
const base = argv[argv.indexOf('--target') + 1];
const files = new Map([['old1', { id: 'old1', name: 'old.zip', createdTime: '2020-01-01T00:00:00Z' }]]);
const calls = [];
let refreshFails = false;
const google = createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
        const body = Buffer.concat(chunks);
        const url = new URL(req.url, 'http://g');
        calls.push(`${req.method} ${url.pathname}`);
        const send = (status, value) => res.writeHead(status, { 'content-type': 'application/json' }).end(typeof value === 'string' ? value : JSON.stringify(value));
        if (url.pathname === '/token') {
            const form = new URLSearchParams(body.toString());
            if (form.get('grant_type') === 'authorization_code') return form.get('code') === 'good' ? send(200, { access_token: 'at-1', refresh_token: 'rt-1', expires_in: 1 }) : send(400, { error: 'bad' });
            return refreshFails ? send(400, { error: 'invalid_grant' }) : send(200, { access_token: 'at-2', expires_in: 3600 });
        }
        if (!/^Bearer at-[12]$/.test(req.headers.authorization ?? '')) return send(401, { error: 'no token' });
        if (url.pathname === '/oauth2/v2/userinfo') return send(200, { email: 'me@example.org' });
        if (url.pathname === '/drive/v3/files' && req.method === 'GET') {
            if (url.searchParams.get('q').includes("name='Aiyu Backups'")) return send(200, { files: [] });
            return send(200, { files: [...files.values()].map(({ data, ...f }) => f) });
        }
        if (url.pathname === '/drive/v3/files' && req.method === 'POST') return send(200, { id: 'folder1' });
        if (url.pathname === '/upload/drive/v3/files') {
            const boundary = req.headers['content-type'].split('boundary=')[1];
            assert.equal(Number(req.headers['content-length']), body.length);
            const text = body.toString('latin1');
            const meta = JSON.parse(text.slice(text.indexOf('{'), text.indexOf('\r\n--' + boundary, 10)));
            const start = text.indexOf('Content-Type: application/zip\r\n\r\n') + 'Content-Type: application/zip\r\n\r\n'.length;
            const data = body.subarray(start, body.lastIndexOf(`\r\n--${boundary}--`));
            assert.equal(data.subarray(0, 2).toString(), 'PK');
            files.set('new1', { id: 'new1', name: meta.name, parents: meta.parents, createdTime: new Date().toISOString(), data });
            return send(200, { id: 'new1', name: meta.name });
        }
        const id = url.pathname.split('/').pop();
        if (!files.has(id)) return send(404, 'missing');
        if (req.method === 'DELETE') { files.delete(id); return res.writeHead(204).end(); }
        return res.writeHead(200, { 'content-type': 'application/zip' }).end(files.get(id).data);
    });
});
await new Promise((r) => google.listen(8799, '127.0.0.1', r));

const form = new FormData();
form.set('username', process.env.ADMIN_USERNAME || '');
form.set('password', process.env.ADMIN_PASSWORD || '');
const login = await fetch(`${base}/api/auth/login`, { method: 'POST', body: form, headers: { 'x-real-ip': '198.51.100.40' } });
const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('session='));
const call = async (method, path, body, headers = {}) => {
    const res = await fetch(base + path, { method, redirect: 'manual', headers: { cookie, 'content-type': 'application/json', ...headers }, body: body && JSON.stringify(body) });
    return { status: res.status, headers: res.headers, body: res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text() };
};

try {
    await call('POST', '/api/admin/gdrive/disconnect');
    let r = await call('POST', '/api/admin/gdrive/config', { clientId: 'cid', clientSecret: 'sec', retentionMonths: 99, autoDeleteEnabled: true });
    assert.deepEqual(r.body, { success: true, isConfigured: true, retentionMonths: 12, autoDeleteEnabled: true });
    r = await call('GET', '/api/admin/gdrive/status');
    assert.equal(r.body.isConnected, false);
    r = await call('POST', '/api/admin/gdrive/backup');
    assert.equal(r.status, 500); assert.match(r.body.error, /refresh token missing/);

    r = await call('GET', '/api/admin/gdrive/auth');
    assert.equal(r.status, 307);
    const consent = new URL(r.headers.get('location'));
    assert.equal(consent.host, 'accounts.google.com'); assert.equal(consent.searchParams.get('client_id'), 'cid');
    const state = consent.searchParams.get('state');
    r = await call('GET', `/api/admin/gdrive/callback?code=good&state=wrong`, null, { cookie: `gdrive_oauth_state=${state}` });
    assert.match(r.headers.get('location'), /gdrive_error=invalid_state$/);
    r = await call('GET', `/api/admin/gdrive/callback?code=bad&state=${state}`, null, { cookie: `gdrive_oauth_state=${state}` });
    assert.match(r.headers.get('location'), /gdrive_error=token_exchange_failed$/);
    r = await call('GET', `/api/admin/gdrive/callback?code=good&state=${state}`, null, { cookie: `gdrive_oauth_state=${state}` });
    assert.match(r.headers.get('location'), /\/admin\/database\?gdrive=connected$/);
    assert.match(r.headers.get('set-cookie'), /gdrive_oauth_state=;.*Max-Age=0/);
    r = await call('GET', '/api/admin/gdrive/status');
    assert.equal(r.body.isConnected, true); assert.equal(r.body.user, 'me@example.org');

    // The first token expired at once, so this refreshes, makes the folder, uploads and purges the old file.
    r = await call('POST', '/api/admin/gdrive/backup?includeImages=false&collections=socials%2Cthemes');
    assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.file.id, 'new1');
    assert.deepEqual(files.get('new1').parents, ['folder1']); assert.match(files.get('new1').name, /^backup_\d{4}-\d\d-\d\d_\d\d-\d\d-\d\d\.zip$/);
    assert.ok(!files.has('old1'), 'expired backup removed');
    r = await call('GET', '/api/admin/gdrive/list');
    assert.equal(r.body.files.length, 1);

    r = await call('POST', '/api/admin/gdrive/restore', { fileId: 'new1' });
    assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.results.socials.status, 'imported'); assert.equal(r.body.results.blogs.status, 'skipped');
    r = await call('POST', '/api/admin/gdrive/restore', { fileId: '../about' });
    assert.equal(r.status, 500); assert.equal(r.body.error, 'Invalid file id');
    r = await call('POST', '/api/admin/gdrive/restore', {});
    assert.equal(r.status, 400);
    r = await call('POST', '/api/admin/gdrive/delete', { fileId: 'new1' });
    assert.deepEqual(r.body, { success: true }); assert.equal(files.size, 0);

    // A dead grant disconnects.
    refreshFails = true;
    await call('POST', '/api/admin/gdrive/config', { clientId: 'cid' });
    const { PrismaClient } = await import('@prisma/client');
    const db = new PrismaClient({ datasources: { db: { url: argv[argv.indexOf('--target-db') + 1] } } });
    const row = await db.config.findFirst();
    await db.config.update({ where: { id: row.id }, data: { data: { ...row.data, gdriveConfig: { ...row.data.gdriveConfig, tokenExpiry: null } } } });
    await db.$disconnect();
    r = await call('GET', '/api/admin/gdrive/list');
    assert.equal(r.status, 500); assert.match(r.body.error, /expired or revoked/);
    r = await call('GET', '/api/admin/gdrive/status');
    assert.equal(r.body.isConnected, false); assert.equal(r.body.isConfigured, true);
    console.log(`drive ok (${calls.length} calls to the stand-in)`);
} finally {
    google.close();
}
