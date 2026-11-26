#!/usr/bin/env node
// Parity of the AI routes: both servers talk to a local stand-in for every provider, and the replies, the requests
// they send and the rows they write are compared. IT WRITES TO THE DATABASE IN DATABASE_URL: local databases only.
// Start both servers with AI_API_BASE_URL=http://127.0.0.1:8799, Next also with
// NODE_OPTIONS=--import=$PWD/scripts/perf/ai-preload.mjs
// Usage: node --env-file=.env scripts/perf/ai-parity.mjs [--next url] [--rust url] [--only <substring>]
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { isDeepStrictEqual } from 'node:util';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const SERVERS = { next: opt('next', 'http://127.0.0.1:3100'), rust: opt('rust', 'http://127.0.0.1:8080') };
const only = opt('only', '');
if (!['localhost', '127.0.0.1', '::1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('local databases only');
const prisma = new PrismaClient();
const PORT = 8799;
const STANDIN = `http://127.0.0.1:${PORT}`;

const key = createHash('sha256').update(String(process.env.JWT_SECRET)).digest('base64').substring(0, 32);
const seal = (text) => { const iv = randomBytes(16); const c = createCipheriv('aes-256-cbc', key, iv); return `${iv.toString('hex')}:${Buffer.concat([c.update(text), c.final()]).toString('hex')}`; };
const opened = (value) => {
    if (Array.isArray(value)) return value.map(opened);
    if (value && typeof value === 'object' && !(value instanceof Date)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, opened(v)]));
    if (typeof value !== 'string' || !/^[0-9a-f]{32}:([0-9a-f]{32})+$/.test(value)) return value;
    const [iv, data] = value.split(':');
    try {
        const d = createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
        return `<encrypted ${Buffer.concat([d.update(Buffer.from(data, 'hex')), d.final()])}>`;
    } catch {
        return value; // sealed under another secret: unchanged by both servers
    }
};

// ── the stand-in ──
let captured = [];
let behaviour = {};
const HEADERS = ['authorization', 'x-api-key', 'x-goog-api-key', 'anthropic-version', 'content-type', 'http-referer', 'x-title'];
// The two servers encode the picture with different libraries: only its kind and size are part of the contract.
async function pictures(value) {
    if (Array.isArray(value)) return Promise.all(value.map(pictures));
    if (value && typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) out[k] = await pictures(v);
        return out;
    }
    const base64 = typeof value === 'string' && (value.match(/^data:[^;]*;base64,(.*)$/s)?.[1] ?? (value.length > 200 && /^[A-Za-z0-9+/=]+$/.test(value) ? value : null));
    if (!base64) return value;
    const meta = await sharp(Buffer.from(base64, 'base64')).metadata().catch(() => null);
    return meta ? `${value.slice(0, value.indexOf(base64))}<${meta.format} ${meta.width}x${meta.height}>` : value;
}
const MODELS = {
    google: { models: [
        { name: 'models/gemini-2.0-flash', displayName: 'Flash', description: 'fast', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-pro', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-embed', supportedGenerationMethods: ['embedContent'] },
        { name: 'models/other', supportedGenerationMethods: ['generateContent'] },
    ] },
    data: { data: [
        { id: 'gpt-4o', owned_by: 'o', name: 'Four', description: 'd'.repeat(150), pricing: { prompt: '0.1', completion: '0.2' } },
        { id: 'o3-mini', owned_by: 'o', pricing: { prompt: '0', completion: '0.0' } },
        { id: 'whisper-1', owned_by: 'o' },
        { id: 'llama', name: '' },
    ] },
};
const server = createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
        const raw = Buffer.concat(chunks).toString();
        let body = raw;
        try { body = JSON.parse(raw); } catch { /* no body */ }
        const headers = Object.fromEntries(HEADERS.filter((h) => req.headers[h] !== undefined).map((h) => [h, req.headers[h].split(';')[0]]));
        if (req.method === 'GET') delete headers['content-type'];
        const path = req.url;
        const send = (status, value) => res.writeHead(status, { 'content-type': 'application/json' }).end(typeof value === 'string' ? value : JSON.stringify(value));
        captured.push({ method: req.method, path, headers, body: await pictures(body) });
        const gateway = path.startsWith('/gw/') || path.startsWith('/ai-gateway.vercel.sh/');
        const failing = behaviour.fail === 'all' || (behaviour.fail === 'gateway' && gateway) || (behaviour.failPath && path.includes(behaviour.failPath));
        if (failing) return send(behaviour.status ?? 500, behaviour.reply ?? { error: { message: 'boom', type: 'server_error' } });
        const text = behaviour.text ?? 'Hello from the model';
        if (path.includes(':generateContent')) return send(200, { candidates: [{ content: { parts: [{ text }], role: 'model' } }], usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 4, totalTokenCount: 7 } });
        if (path.startsWith('/api.anthropic.com/')) return send(200, { content: [{ type: 'text', text }], usage: { input_tokens: 5, output_tokens: 6 } });
        if (path.endsWith('/chat/completions')) return send(200, { choices: [{ message: { content: text } }], usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } });
        if (path.startsWith('/generativelanguage.googleapis.com/v1beta/models')) return send(200, MODELS.google);
        return send(200, MODELS.data);
    });
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

// ── fixtures ──
const types = ['google', 'openai', 'groq', 'openrouter', 'anthropic', 'mistral', 'deepseek', 'together', 'fireworks', 'xai', 'replicate'];
const providers = types.map((type) => ({ id: `p-${type}`, name: `${type} key`, type, apiKey: seal(`key-${type}`) }));
const models = types.map((type) => ({ id: `m-${type}`, modelId: type === 'google' ? 'gemini-9' : `${type}-model`, providerId: `p-${type}`, isFree: false }));
const ai = (extra = {}) => ({ enabled: true, systemInstruction: 'Be brief.', providers, models, textPriority: ['m-groq'], imagePriority: ['m-openai'], enabledProviders: ['groq', 'openrouter', 'gemini'], ...extra });
const secrets = { encryptedGroqApiKey: seal('old-groq'), encryptedOpenRouterApiKey: seal('old-router'), encryptedGeminiApiKey: seal('old-gemini') };

const original = await prisma.config.findFirst();
const restore = () => prisma.config.update({ where: { id: original.id }, data: { ...original, data: original.data } });

const form = new FormData();
form.set('username', process.env.ADMIN_USERNAME || '');
form.set('password', process.env.ADMIN_PASSWORD || '');
const login = await fetch(`${SERVERS.next}/api/auth/login`, { method: 'POST', body: form, headers: { 'x-real-ip': '198.51.100.9', 'user-agent': 'ai-parity' } });
const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('session='));
if (!cookie) throw new Error(`login failed (${login.status})`);

// ── cases ──
const cases = [];
const add = (method, path, name, rest = {}) => cases.push({ method, path, name, ...rest });
const CONFIG = '/api/admin/ai/config';
const MODELS_PATH = '/api/admin/ai/models';
const CHECK = '/api/admin/ai/validate-provider';
const TEXT = '/api/admin/ai/text';
const CAPTION = '/api/admin/ai/generate';
const ANALYZE = '/api/admin/health/analyze';

add('GET', CONFIG, 'read', { ai: ai({ gatewayApiKey: seal('gw') }), secrets });
add('GET', CONFIG, 'read nothing configured', { ai: null });
add('GET', CONFIG, 'anonymous', { anonymous: true });
add('PUT', CONFIG, 'keep, replace and clear keys', { ai: ai(), secrets, body: { enabled: false, systemInstruction: 'S', gatewayUrl: 'http://x', gatewayApiKey: 'new-gw', providers: [
    { id: 'p-google', name: 'G', type: 'google', apiKey: '•••• •••• •••• ••••' },
    { id: 'p-groq', name: '  ', type: 'groq', apiKey: 'fresh' },
    { id: 'p-openai', name: 'O', type: 'openai', apiKey: '' },
    { id: 'p-new', type: 'groq' },
    { id: 'p-odd', type: 'nothing' },
], models: [{ id: 'm', modelId: 'x', providerId: 'p-groq' }], textPriority: ['m'], imagePriority: [] } });
add('PUT', CONFIG, 'clear the gateway key', { ai: ai({ gatewayApiKey: seal('gw') }), body: { gatewayApiKey: '' } });
add('PUT', CONFIG, 'empty object', { ai: ai(), body: {} });
add('PUT', CONFIG, 'anonymous', { anonymous: true, body: {} });

add('GET', MODELS_PATH, 'all providers', { ai: ai() });
add('GET', `${MODELS_PATH}?providerId=p-google`, 'one provider', { ai: ai() });
add('GET', `${MODELS_PATH}?providerId=nope`, 'unknown provider', { ai: ai() });
add('GET', `${MODELS_PATH}?providerId=p-groq`, 'provider refuses', { ai: ai(), behaviour: { fail: 'all' } });
add('GET', MODELS_PATH, 'anonymous', { anonymous: true });
for (const type of [...types, 'cohere']) add('POST', MODELS_PATH, `discover ${type}`, { body: { type, apiKey: 'k' } });
add('POST', MODELS_PATH, 'discover without key', { body: { type: 'groq' } });

for (const type of [...types, 'cohere', 'perplexity', 'stabilityai', 'aws', 'azure', 'unknown']) {
    add('POST', CHECK, `accepts ${type}`, { body: { type, apiKey: 'k' } });
    add('POST', CHECK, `refuses ${type}`, { body: { type, apiKey: 'k' }, behaviour: { fail: 'all', status: 401 } });
}
add('POST', CHECK, 'refusal without a message', { body: { type: 'openai', apiKey: 'k' }, behaviour: { fail: 'all', status: 403, reply: 'no' } });
add('POST', CHECK, 'anthropic bad request accepted', { body: { type: 'anthropic', apiKey: 'k' }, behaviour: { fail: 'all', status: 400, reply: { error: { type: 'invalid_request_error' } } } });
add('POST', CHECK, 'anthropic other bad request', { body: { type: 'anthropic', apiKey: 'k' }, behaviour: { fail: 'all', status: 400, reply: { error: { type: 'x' } } } });
add('POST', CHECK, 'missing', { body: {} });
add('POST', CHECK, 'anonymous', { anonymous: true, body: {} });

const context = { title: 'T', tags: ['a', 'b'], name: 'N', roles: 'R', summary: 'S', role: 'Dev', company: 'Co', techStack: 'Rust', section: 'X', errors: 'E', sectionType: 'work', jobDescription: 'J' };
for (const mode of ['generate_blog', 'proofread', 'suggest_excerpt', 'suggest_tags', 'suggest_title', 'continue_blog', 'generate_home_code', 'refine_summary', 'suggest_skills', 'refine_experience', 'refine_project_description', 'suggest_tech_stack', 'suggest_project_name', 'generate_subtitle', 'latex_refine', 'latex_fix', 'latex_generate', 'latex_tailor', 'resume_expand_idea', 'generate_theme', 'something_else']) {
    add('POST', TEXT, `mode ${mode}`, { ai: ai(), body: { prompt: `About ${mode} `.repeat(150), mode, context } });
}
add('POST', TEXT, 'no context', { ai: ai(), body: { prompt: 'p', mode: 'latex_fix' } });
add('POST', TEXT, 'no mode', { ai: ai(), body: { prompt: 'p' } });
for (const type of types) add('POST', TEXT, `provider ${type}`, { ai: ai({ textPriority: [`m-${type}`] }), body: { prompt: 'p' } });
add('POST', TEXT, 'legacy gemini', { ai: ai({ textPriority: [] }), body: { prompt: 'p' } });
add('POST', TEXT, 'nothing configured', { ai: ai({ textPriority: [], providers: [] }), body: { prompt: 'p' } });
add('POST', TEXT, 'fails over', { ai: ai({ textPriority: ['m-openai', 'm-groq'] }), body: { prompt: 'p' }, behaviour: { failPath: 'api.openai.com' } });
add('POST', TEXT, 'all fail', { ai: ai({ textPriority: ['m-openai', 'm-anthropic'] }), body: { prompt: 'p' }, behaviour: { fail: 'all' } });
add('POST', TEXT, 'gemini fails', { ai: ai({ textPriority: ['m-google'] }), body: { prompt: 'p' }, behaviour: { fail: 'all' } });
add('POST', TEXT, 'empty answer', { ai: ai(), body: { prompt: 'p' }, behaviour: { text: '' } });
add('POST', TEXT, 'fenced answer', { ai: ai(), body: { prompt: 'p' }, behaviour: { text: '  ```json\n{"a":1}\n```  ' } });
add('POST', TEXT, 'through the gateway', { ai: ai({ gatewayUrl: `${STANDIN}/gw/`, gatewayApiKey: seal('gw') }), body: { prompt: 'p' } });
add('POST', TEXT, 'gateway key only', { ai: ai({ gatewayApiKey: seal('gw'), textPriority: ['m-aws'], providers: [{ id: 'p-aws', type: 'aws', apiKey: seal('a') }], models: [{ id: 'm-aws', modelId: 'claude', providerId: 'p-aws' }] }), body: { prompt: 'p' } });
add('POST', TEXT, 'gateway falls back', { ai: ai({ gatewayUrl: `${STANDIN}/gw` }), body: { prompt: 'p' }, behaviour: { fail: 'gateway' } });
add('POST', TEXT, 'openrouter skips the gateway', { ai: ai({ gatewayUrl: `${STANDIN}/gw`, textPriority: ['m-openrouter'] }), body: { prompt: 'p' } });
add('POST', TEXT, 'disabled', { ai: ai({ enabled: false }), body: { prompt: 'p' } });
add('POST', TEXT, 'no prompt', { ai: ai(), body: { mode: 'generate_blog' } });
add('POST', TEXT, 'anonymous', { anonymous: true, body: { prompt: 'p' } });

const png = await sharp({ create: { width: 2000, height: 1200, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 0.5 } } }).png().toBuffer();
const small = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#123456' } }).jpeg().toBuffer();
const upload = (data, type, name, prompt) => () => { const f = new FormData(); if (data) f.set('file', new Blob([data], { type }), name); if (prompt) f.set('prompt', prompt); return f; };
for (const type of ['google', 'openai', 'anthropic']) add('POST', CAPTION, `caption by ${type}`, { ai: ai({ imagePriority: [`m-${type}`] }), form: upload(png, 'image/png', 'a.png'), behaviour: { text: ' "A red square" ' } });
add('POST', CAPTION, 'small picture, own prompt, gateway', { ai: ai({ gatewayUrl: `${STANDIN}/gw` }), form: upload(small, 'image/jpeg', 'b.jpg', 'Describe') });
add('POST', CAPTION, 'not a picture', { ai: ai(), form: upload(Buffer.from('nonsense'), 'image/png', 'c.png') });
add('POST', CAPTION, 'no file', { ai: ai(), form: upload(null, '', '', 'x') });
add('POST', CAPTION, 'too large', { ai: ai(), form: upload(Buffer.alloc(10 * 1024 * 1024 + 1), 'image/png', 'd.png') });
add('POST', CAPTION, 'all fail', { ai: ai(), form: upload(small, 'image/jpeg', 'b.jpg'), behaviour: { fail: 'all' } });
add('POST', CAPTION, 'disabled', { ai: ai({ enabled: false }), form: upload(small, 'image/jpeg', 'b.jpg') });
add('POST', CAPTION, 'anonymous', { anonymous: true, form: upload(small, 'image/jpeg', 'b.jpg') });

add('POST', ANALYZE, 'pasted logs', { ai: ai(), secrets, body: { logText: ' panic at line 1 ' } });
add('POST', ANALYZE, 'no logs', { ai: ai(), secrets, body: {} });
add('POST', ANALYZE, 'falls to gemini', { ai: ai(), secrets, body: { logText: 'x' }, behaviour: { failPath: 'chat/completions' } });
add('POST', ANALYZE, 'all fail', { ai: ai(), secrets, body: { logText: 'x' }, behaviour: { fail: 'all' } });
add('POST', ANALYZE, 'no provider enabled', { ai: ai({ enabledProviders: [] }), secrets, body: { logText: 'x' } });
add('POST', ANALYZE, 'disabled', { ai: ai({ enabled: false }), body: { logText: 'x' } });
add('POST', ANALYZE, 'anonymous', { anonymous: true, body: {} });

// ── run ──
// Rows hold large documents: show only where two values part.
function firstDifference(a, b, path = '') {
    if (a && b && typeof a === 'object' && typeof b === 'object' && !(a instanceof Date)) {
        const k = [...new Set([...Object.keys(a), ...Object.keys(b)])].find((key) => !isDeepStrictEqual(a[key], b[key]));
        if (k !== undefined) return firstDifference(a[k], b[k], `${path}.${k}`);
    }
    return `${path}\n    next ${JSON.stringify(a)?.slice(0, 400)}\n    rust ${JSON.stringify(b)?.slice(0, 400)}`;
}
let requests = 0;
async function run(target, test) {
    await restore();
    const data = { ...original.data };
    if (test.ai !== undefined) { if (test.ai === null) delete data.ai; else data.ai = test.ai; }
    await prisma.config.update({ where: { id: original.id }, data: { data, updatedAt: original.updatedAt, ...test.secrets } });
    // Next keeps nothing about the settings between calls; the rows written are the ones newer than this.
    const since = new Date(Date.now() - 5);
    captured = [];
    behaviour = test.behaviour ?? {};
    const headers = { 'x-real-ip': `198.51.102.${++requests % 250}`, 'user-agent': 'ai-parity' };
    if (!test.anonymous) headers.cookie = cookie;
    let body = test.form?.();
    if (test.body !== undefined) { body = JSON.stringify(test.body); headers['content-type'] = 'application/json'; }
    const res = await fetch(SERVERS[target] + test.path, { method: test.method, headers, body });
    const text = await res.text();
    let reply = text;
    try { reply = JSON.parse(text); } catch { /* not JSON */ }
    const logs = await prisma.aiLog.findMany({ where: { createdAt: { gte: since } } });
    await prisma.aiLog.deleteMany({ where: { id: { in: logs.map((l) => l.id) } } });
    const row = await prisma.config.findFirst();
    // `updatedAt` is the time of the write: only whether it moved is compared.
    const stored = test.method === 'PUT' ? opened({ ...row, id: undefined, updatedAt: row.updatedAt >= since }) : undefined;
    return { status: res.status, reply, captured, logs: logs.map(({ id: _i, createdAt: _c, updatedAt: _u, ...rest }) => rest), stored };
}

let failed = 0;
let total = 0;
try {
    for (const test of cases) {
        const name = `${test.method} ${test.path} - ${test.name}`;
        if (only && !name.includes(only)) continue;
        total++;
        const next = await run('next', test);
        const rust = await run('rust', test);
        const wrong = Object.keys(next).filter((k) => !isDeepStrictEqual(next[k], rust[k]));
        console.log(`${wrong.length ? 'FAIL' : 'ok  '} ${name} [${next.status}, ${next.captured.length} sent, ${next.logs.length} logged]`);
        for (const k of wrong) console.log(`  ${k} ${firstDifference(next[k], rust[k])}`);
        failed += wrong.length ? 1 : 0;
    }
} finally {
    await restore();
    await prisma.session.deleteMany({ where: { userAgent: 'ai-parity' } });
    await prisma.auditLog.deleteMany({ where: { userAgent: 'ai-parity' } });
    await prisma.$disconnect();
    server.close();
}
console.log(`${total - failed}/${total} equal`);
process.exit(failed ? 1 : 0);
