/**
 * Record the v2 life story (hero film → chapter 09 "now") to MP4, on desktop
 * and on mobile.
 *
 *   npm run record                       # prod build, 2×, journey-desktop.mp4 + journey-mobile.mp4
 *   npm run record:desktop               # desktop only
 *   npm run record:mobile                # mobile only
 *   npm run record -- --speed 3          # any speed the story player offers
 *   npm run record -- --skip-build       # reuse the existing .next build
 *   npm run record -- --url http://localhost:3000   # record a running server
 *
 * Options (flags win over env vars):
 *   --device <d>       STORY_DEVICE   desktop | mobile | both. Default both
 *   --speed <n>        STORY_SPEED    playback speed, one of the player's (1, 1.5, 2, 3). Default 2
 *   --out-dir <dir>    STORY_OUT_DIR  where journey-<device>.mp4 is written. Default the repo root
 *   --fps <n>          STORY_FPS      output frame rate. Default 60
 *   --port <n>         STORY_PORT     port for the prod server. Default 3100
 *   --path <p>         STORY_PATH     page to record. Default /v2
 *   --url <origin>     STORY_URL      record an already running server (no build/start)
 *   --skip-build                      skip `next build`, start the existing build
 *   --show-controls                   keep the story player pill in the video
 *   --headed                          show the browser window while recording
 *
 * Recording is frame-stepped, not real time: the page runs on Playwright's
 * fake clock, which is advanced exactly 1/fps per frame before each
 * screenshot. The story's motion (autoplay scroll, GSAP, the films) runs off
 * that clock, so the video is a true, stutter-free 60fps however slowly the
 * machine renders. It takes longer than the video's length to capture.
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Output is width × deviceScaleFactor: 1920×1080 and 780×1688.
const DEVICES = {
    desktop: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
    mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

// ------------------------------------------------------------------ options
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, env, fallback) => {
    const i = argv.indexOf(`--${name}`);
    if (i !== -1 && argv[i + 1] !== undefined) return argv[i + 1];
    return process.env[env] ?? fallback;
};

const device = opt('device', 'STORY_DEVICE', 'both');
const speed = Number(opt('speed', 'STORY_SPEED', 2));
const fps = Number(opt('fps', 'STORY_FPS', 60));
const port = Number(opt('port', 'STORY_PORT', 3100));
const pagePath = opt('path', 'STORY_PATH', '/v2');
const outDir = path.resolve(ROOT, opt('out-dir', 'STORY_OUT_DIR', '.'));
const externalUrl = opt('url', 'STORY_URL', '');
const skipBuild = flag('skip-build');
const showControls = flag('show-controls');
const headed = flag('headed');

for (const [name, value] of Object.entries({ speed, fps, port })) {
    if (!Number.isFinite(value) || value <= 0) {
        console.error(`Invalid --${name}: ${value}`);
        process.exit(1);
    }
}
const devices = device === 'both' ? Object.keys(DEVICES) : [device];
if (!devices.every((d) => DEVICES[d])) {
    console.error(`Invalid --device: ${device} (desktop, mobile or both)`);
    process.exit(1);
}

const origin = externalUrl ? externalUrl.replace(/\/$/, '') : `http://localhost:${port}`;
const log = (msg) => console.log(`[record] ${msg}`);

// ------------------------------------------------------------------ helpers
const run = (cmd, args) => new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: ROOT, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`))));
});

const isUp = (url) => new Promise((resolve) => {
    const req = http.get(url, (res) => {
        res.resume();
        resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
    });
});

async function waitForServer(url, seconds = 90) {
    for (let i = 0; i < seconds; i++) {
        if (await isUp(url)) return;
        await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(`Server at ${url} did not come up within ${seconds}s`);
}

const nextBin = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');

async function launchBrowser() {
    const options = {
        headless: !headed,
        args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
    };
    try {
        return await chromium.launch(options);
    } catch (err) {
        // No Playwright Chromium downloaded: fall back to the system Chrome.
        log(`Playwright Chromium unavailable (${err.message.split('\n')[0]}), trying installed Chrome`);
        return chromium.launch({ ...options, channel: 'chrome' });
    }
}

// ------------------------------------------------------------------ recorder
/** Pipes JPEG frames into ffmpeg, one per 1/fps of video. */
function createEncoder(file) {
    const ffmpeg = spawn('ffmpeg', [
        '-y', '-loglevel', 'error',
        '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
        // Even dimensions for yuv420p.
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        file,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });

    const done = new Promise((resolve, reject) => {
        ffmpeg.on('error', reject);
        ffmpeg.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
    });

    let written = 0;
    return {
        get seconds() {
            return written / fps;
        },
        async frame(buffer) {
            written++;
            // Respect backpressure so frames do not pile up in memory.
            if (!ffmpeg.stdin.write(buffer)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
        },
        async finish() {
            ffmpeg.stdin.end();
            await done;
            return written / fps;
        },
    };
}

async function record(browser, name) {
    const preset = DEVICES[name];
    const out = path.join(outDir, `journey-${name}.mp4`);
    const context = await browser.newContext({
        ...preset,
        reducedMotion: 'no-preference',
        colorScheme: 'dark',
    });
    try {
        // Mark the app as already running so the boot screen is skipped and
        // the video opens on the hero, and dismiss the arcade / v2 beta popups.
        await context.addInitScript(() => {
            try {
                localStorage.setItem('aiyu:lastSeen', String(Date.now()));
                localStorage.setItem('arcade-popup-dismissed', '1');
                localStorage.setItem('v2-beta-popup-dismissed', '1');
            } catch { /* storage blocked */ }
        });
        // Fake timers from the first script on; the clock runs normally until
        // it is paused for the frame-stepped capture.
        await context.clock.install();
        const page = await context.newPage();

        log(`[${name}] Opening ${origin}${pagePath}…`);
        await page.goto(`${origin}${pagePath}`, { waitUntil: 'load', timeout: 120_000 });
        await page.waitForSelector('#story-now', { state: 'attached', timeout: 60_000 });

        // Pick the speed on the story player before pressing play (the
        // segmented control is in the DOM on every screen size).
        const speedSet = await page.evaluate((wanted) => {
            const radios = [...document.querySelectorAll('[data-story-player] [role="radio"]')];
            const match = radios.find((r) => r.textContent.trim() === `${wanted}×`);
            if (match) match.click();
            return { ok: !!match, offered: radios.map((r) => r.textContent.trim()) };
        }, speed);
        if (!speedSet.ok) throw new Error(`Speed ${speed}× is not offered by the story player (${speedSet.offered.join(', ')})`);

        // Let the hero film paint and its short intro (~1.6s) play out. The
        // hero button reads "Play story" on desktop and "Play" on phones.
        const heroPlay = page.locator('button').filter({ hasText: /play story/i }).first();
        await heroPlay.waitFor({ state: 'visible', timeout: 60_000 });
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(3000);

        if (!showControls) {
            await page.addStyleTag({ content: '[data-story-player]{opacity:0!important}' });
        }

        const { width, height } = preset.viewport;
        const scale = preset.deviceScaleFactor;
        const cdp = await context.newCDPSession(page);
        const encoder = createEncoder(out);
        const frameMs = 1000 / fps;

        // Advance the page by one frame, then capture it.
        const step = async () => {
            await page.clock.runFor(frameMs);
            const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true });
            await encoder.frame(Buffer.from(data, 'base64'));
        };
        const stepFor = async (ms) => {
            for (let t = 0; t < ms; t += frameMs) await step();
        };
        const playing = () => page.evaluate(() => document.querySelector('[data-story-player] button[aria-pressed]')?.getAttribute('aria-pressed') === 'true');

        await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 100);

        log(`[${name}] Recording at ${speed}×, ${fps}fps → ${path.relative(ROOT, out)}`);
        // A short beat on the hero before the story starts moving. click()
        // dispatches only a click, which autoplay does not read as scrolling.
        await stepFor(1000);
        await heroPlay.evaluate((button) => button.click());
        await step();
        if (!(await playing())) throw new Error('The story did not start playing');

        // Autoplay pauses itself at the end of chapter 09.
        const began = Date.now();
        const limit = 30 * 60 * fps;
        let frames = 0;
        while (await playing()) {
            if (++frames > limit) throw new Error('The story did not finish within 30 minutes of video');
            await step();
            if (frames % fps === 0) {
                const rate = (frames / ((Date.now() - began) / 1000)).toFixed(1);
                process.stdout.write(`\r[record] [${name}] ${encoder.seconds.toFixed(0)}s of video captured (${rate} frames/s)…`);
            }
        }
        process.stdout.write('\n');

        // Hold the last frame of chapter 09 for a moment.
        await stepFor(1500);
        const seconds = await encoder.finish();
        log(`[${name}] Saved ${path.relative(ROOT, out)} (${seconds.toFixed(1)}s, ${width * scale}×${height * scale} @ ${fps}fps)`);
    } finally {
        await context.close().catch(() => {});
    }
}

// ------------------------------------------------------------------ main
let server = null;
let browser = null;

const cleanup = () => {
    if (server && server.exitCode === null) server.kill('SIGTERM');
};
process.on('SIGINT', () => {
    cleanup();
    process.exit(130);
});

try {
    if (!externalUrl) {
        if (!skipBuild) {
            log('Building production bundle (next build)…');
            await run(process.execPath, [nextBin, 'build']);
        } else if (!fs.existsSync(path.join(ROOT, '.next', 'BUILD_ID'))) {
            throw new Error('--skip-build given but no production build found in .next');
        }
        if (await isUp(origin)) throw new Error(`Port ${port} is already in use, pick another with --port`);
        log(`Starting production server on ${origin}…`);
        server = spawn(process.execPath, [nextBin, 'start', '-p', String(port)], {
            cwd: ROOT,
            stdio: ['ignore', 'ignore', 'inherit'],
            env: { ...process.env, NODE_ENV: 'production' },
        });
    }
    await waitForServer(origin);

    fs.mkdirSync(outDir, { recursive: true });
    browser = await launchBrowser();
    for (const name of devices) await record(browser, name);
} catch (err) {
    console.error(`[record] ${err.message}`);
    process.exitCode = 1;
} finally {
    await browser?.close().catch(() => {});
    cleanup();
}
