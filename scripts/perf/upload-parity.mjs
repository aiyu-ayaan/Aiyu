#!/usr/bin/env node
// Parity of image uploads: the same files go to Next (sharp) and Rust. Replies and the stored pictures are compared
// (format, size, orientation, transparency, colour), not bytes. Files created by the run are removed.
// Usage: node --env-file=.env scripts/perf/upload-parity.mjs [--next url] [--rust url] [--uploads public/uploads]
import { readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const SERVERS = { next: opt('next', 'http://127.0.0.1:3100'), rust: opt('rust', 'http://127.0.0.1:8080') };
const UPLOADS = opt('uploads', 'public/uploads');

const form = new FormData();
form.set('username', process.env.ADMIN_USERNAME || '');
form.set('password', process.env.ADMIN_PASSWORD || '');
const login = await fetch(`${SERVERS.next}/api/auth/login`, { method: 'POST', body: form, headers: { 'x-real-ip': '198.51.100.9' } });
const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('session='));

// A picture with a left-to-right gradient and a bright block, so resizing, rotation and colour can be seen.
function picture(width, height, channels = 3) {
    const raw = Buffer.alloc(width * height * channels);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const at = (y * width + x) * channels;
            const block = x < width / 4 && y < height / 4;
            raw[at] = block ? 250 : Math.floor((x / width) * 255);
            raw[at + 1] = block ? 240 : 80;
            raw[at + 2] = block ? 20 : Math.floor((y / height) * 255);
            if (channels === 4) raw[at + 3] = x < width / 2 ? 255 : 120;
        }
    }
    return sharp(raw, { raw: { width, height, channels } });
}

const jpeg = await picture(1600, 1000).withMetadata({ orientation: 6 }).jpeg({ quality: 92 }).toBuffer();
const files = [
    { name: 'rotated.jpg', type: 'image/jpeg', data: jpeg },
    { name: 'huge.png', type: 'image/png', data: await picture(3200, 1800, 4).png().toBuffer() },
    { name: 'tall.png', type: 'image/png', data: await picture(700, 2900).png().toBuffer() },
    { name: 'small.webp', type: 'image/webp', data: await picture(120, 90).webp().toBuffer() },
    { name: 'anim.gif', type: 'image/gif', data: await picture(300, 200).gif().toBuffer() },
    { name: 'gray.jpg', type: 'image/jpeg', data: await picture(900, 600).grayscale().jpeg().toBuffer() },
    { name: 'profile.jpg', type: 'image/jpeg', data: await picture(1000, 700).withIccProfile('p3').jpeg().toBuffer() },
    { name: 'unlabelled.png', type: 'application/octet-stream', data: await picture(50, 50).png().toBuffer() },
    { name: 'named', type: 'image/png', data: await picture(60, 40).png().toBuffer(), asked: 'cover' },
    { name: 'broken.png', type: 'image/png', data: Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'), Buffer.from('nonsense')]) },
    { name: 'fake.jpg', type: 'image/jpeg', data: Buffer.from('plain text') },
    { name: 'drawing.svg', type: 'image/svg+xml', data: Buffer.from('<svg/>') },
    { name: 'empty.png', type: 'image/png', data: Buffer.alloc(0) },
    { name: 'toobig.png', type: 'image/png', data: Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'), Buffer.alloc(10 * 1024 * 1024)]) },
    { name: 'phone.heic', type: 'image/heic', data: Buffer.from('\0\0\0\x18ftypheicnot really', 'latin1') },
];

const created = new Set();
async function describe(url) {
    if (!url) return null;
    const file = join(UPLOADS, url.split('/').pop());
    created.add(file);
    const data = await readFile(file);
    try {
        const image = sharp(data);
        const m = await image.metadata();
        // Colours are compared as a viewer sees them: converted to sRGB through the file's profile. sharp tags every
        // output with sRGB and orientation 1; a file without either tag means the same.
        const { channels } = await sharp(await sharp(data).png().toBuffer()).stats();
        return { format: m.format, width: m.width, height: m.height, orientation: m.orientation ?? 1, alpha: m.hasAlpha, mean: channels.map((c) => Math.round(c.mean)) };
    } catch {
        return { unreadable: data.length };
    }
}

// Encoders differ, so colour means may be a few levels apart.
const close = (a, b) => a === b || (a && b && a.mean && b.mean && a.mean.length === b.mean.length && a.mean.every((v, i) => Math.abs(v - b.mean[i]) <= 3)
    && isDeepStrictEqual({ ...a, mean: 0 }, { ...b, mean: 0 })) || isDeepStrictEqual(a, b);

async function send(server, path, file) {
    const body = new FormData();
    body.set('file', new File([file.data], file.name, { type: file.type }));
    if (file.asked) body.set('name', file.asked);
    const res = await fetch(SERVERS[server] + path, { method: 'POST', body, headers: { cookie } });
    const reply = await res.json().catch(() => null);
    const info = reply?.data ?? reply ?? {};
    const main = await describe(info.url);
    const thumb = await describe(info.thumbnailUrl);
    // Random parts of the name, and the encoded size, differ.
    const shape = (u) => (u ? u.replace(/\d+-[a-z0-9]+-\d+/, '<n>') : u);
    const rest = { ...info, url: shape(info.url), thumbnailUrl: shape(info.thumbnailUrl), filename: shape(info.filename), size: info.size === undefined ? undefined : '<n>' };
    return { status: res.status, success: reply?.success, rest, main, thumb };
}

let failed = 0;
let total = 0;
try {
    for (const path of ['/api/upload', '/api/admin/images/upload']) {
        for (const file of path === '/api/upload' ? files : files.slice(0, 2).concat(files.slice(-5))) {
            total++;
            const next = await send('next', path, file);
            const rust = await send('rust', path, file);
            const wrong = [];
            if (next.status !== rust.status) wrong.push('status');
            if (next.success !== rust.success) wrong.push('success');
            // The admin route repeats the library's own error text for unexpected failures.
            if (!isDeepStrictEqual(next.rest, rust.rest)) wrong.push('rest');
            if (!close(next.main, rust.main)) wrong.push('main');
            if (!close(next.thumb, rust.thumb)) wrong.push('thumb');
            console.log(`${wrong.length ? 'DIFF' : 'ok  '} ${path} ${file.name} [${next.status}]`);
            for (const k of wrong) console.log(`  ${k}\n    next ${JSON.stringify(next[k])}\n    rust ${JSON.stringify(rust[k])}`);
            failed += wrong.length ? 1 : 0;
        }
    }
    const [a, b] = await Promise.all(['next', 'rust'].map(async (s) => fetch(`${SERVERS[s]}/api/uploads/${[...created][0].split('/').pop()}`)));
    for (const h of ['content-type', 'content-length', 'cache-control', 'content-disposition', 'x-content-type-options']) {
        if (a.headers.get(h) !== b.headers.get(h)) console.log(`DIFF serve ${h}: ${a.headers.get(h)} -> ${b.headers.get(h)}`);
    }
    const same = Buffer.from(await a.arrayBuffer()).equals(Buffer.from(await b.arrayBuffer()));
    console.log(`${same ? 'ok  ' : 'DIFF'} serve ${a.status} ${b.status}`);
} finally {
    for (const file of created) await unlink(file).catch(() => {});
}
console.log(`${total - failed}/${total} equal`);
process.exit(failed ? 1 : 0);
