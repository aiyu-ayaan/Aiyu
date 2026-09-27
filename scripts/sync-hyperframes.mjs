#!/usr/bin/env node
/**
 * Publishes the HyperFrames compositions in /hyperframes into /public/hf so
 * the site can embed them with <hyperframes-player>.
 *
 * Source projects stay CLI-friendly (CDN GSAP, `npx hyperframes check`
 * works in each folder). The published copies are rewritten for the site:
 *   - GSAP and the HyperFrames runtime are served from /hf/vendor, so the
 *     site CSP (script-src 'self') holds and the player never injects its
 *     CDN runtime (it skips injection when the runtime bridge exists).
 *   - A portrait twin (1080×1920) is emitted next to each landscape file;
 *     the compositions carry `@media (orientation: portrait)` layouts.
 *   - An optional assets/ folder (images the film shows) is copied beside
 *     the published files, so relative `assets/…` paths work in both.
 *   - A content hash per composition is written to
 *     src/app/components/shared/hfVersions.json; the site appends it to the
 *     film URL so a browser can never pair a cached old film with new page
 *     code (e.g. a shorter film under a longer scroll mapping).
 *
 * Usage: npm run hf:sync
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const SRC = path.join(root, 'hyperframes');
const OUT = path.join(root, 'public', 'hf');
// boot + the hero film, then the life-story chapters in page order.
const COMPOSITIONS = ['boot', 'story', 'origin', 'school', 'college', 'bitapp', 'voice', 'masters', 'adrosonic', 'now'];

const VENDOR = [
    ['node_modules/gsap/dist/gsap.min.js', 'gsap.min.js'],
    ['node_modules/@hyperframes/core/dist/hyperframe.runtime.iife.js', 'hyperframe.runtime.iife.js'],
];

const CDN_GSAP = /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@[^"]+"><\/script>/;
const LOCAL_SCRIPTS =
    '<script src="/hf/vendor/hyperframe.runtime.iife.js"></script>\n    <script src="/hf/vendor/gsap.min.js"></script>';

function toPortrait(html) {
    return html
        .replace('content="width=1920, height=1080"', 'content="width=1080, height=1920"')
        .replace(/data-width="1920" data-height="1080"/, 'data-width="1080" data-height="1920"');
}

async function main() {
    await fs.mkdir(path.join(OUT, 'vendor'), { recursive: true });
    for (const [from, to] of VENDOR) {
        await fs.copyFile(path.join(root, from), path.join(OUT, 'vendor', to));
    }

    const versions = {};
    for (const name of COMPOSITIONS) {
        const source = await fs.readFile(path.join(SRC, name, 'index.html'), 'utf8');
        if (!CDN_GSAP.test(source)) {
            throw new Error(`${name}/index.html: expected the CDN GSAP <script> to rewrite`);
        }
        const landscape = source.replace(CDN_GSAP, LOCAL_SCRIPTS);
        const portrait = toPortrait(landscape);
        if (portrait === landscape) {
            throw new Error(`${name}/index.html: could not derive the portrait variant`);
        }
        await fs.mkdir(path.join(OUT, name), { recursive: true });
        await fs.writeFile(path.join(OUT, name, 'index.html'), landscape);
        await fs.writeFile(path.join(OUT, name, 'portrait.html'), portrait);
        const hash = createHash('sha256').update(landscape);
        const assets = path.join(SRC, name, 'assets');
        const hasAssets = await fs.stat(assets).then((s) => s.isDirectory(), () => false);
        if (hasAssets) {
            await fs.cp(assets, path.join(OUT, name, 'assets'), { recursive: true });
            for (const file of (await fs.readdir(assets)).sort()) {
                hash.update(file).update(await fs.readFile(path.join(assets, file)));
            }
        }
        versions[name] = hash.digest('hex').slice(0, 10);
        console.log(`[hf] ${name} → public/hf/${name}/{index,portrait}.html (${versions[name]})`);
    }
    await fs.writeFile(
        path.join(root, 'src', 'app', 'components', 'shared', 'hfVersions.json'),
        `${JSON.stringify(versions, null, 2)}\n`
    );
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
