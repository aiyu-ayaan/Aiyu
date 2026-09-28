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
 *   --fps <n>          STORY_FPS      output frame rate. Default 30
 *   --port <n>         STORY_PORT     port for the prod server. Default 3100
 *   --path <p>         STORY_PATH     page to record. Default /v2
 *   --url <origin>     STORY_URL      record an already running server (no build/start)
 *   --skip-build                      skip `next build`, start the existing build
 *   --show-controls                   keep the story player pill in the video
 *   --headed                          show the browser window while recording
 *
 * Frames come from the Chrome DevTools screencast (sharper than Playwright's
 * built-in recorder) and are piped into ffmpeg at a constant frame rate.
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
const fps = Number(opt('fps', 'STORY_FPS', 30));
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
/**
 * Pipes screencast JPEGs into ffmpeg at a constant frame rate. The screencast
 * only emits a frame when the screen changes, so each frame is held (written
 * again) until the next one arrives.
 */
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

    let start = null;
    // Screencast timestamps vs this clock, so the tail can be timed even
    // when no new frame arrives (a still screen).
    let clockOffset = 0;
    let written = 0;
    let lastFrame = null;

    const writeUntil = (seconds) => {
        const target = Math.floor(seconds * fps);
        while (lastFrame && written < target) {
            ffmpeg.stdin.write(lastFrame);
            written++;
        }
    };

    return {
        frame(buffer, timestamp) {
            if (start === null) {
                start = timestamp;
                clockOffset = Date.now() / 1000 - timestamp;
            }
            writeUntil(timestamp - start);
            lastFrame = buffer;
        },
        async finish() {
            if (start !== null) writeUntil(Date.now() / 1000 - clockOffset - start);
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
        cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
            encoder.frame(Buffer.from(data, 'base64'), metadata.timestamp);
            cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
        });
        await cdp.send('Page.startScreencast', {
            format: 'jpeg', quality: 92, maxWidth: width * scale, maxHeight: height * scale, everyNthFrame: 1,
        });

        log(`[${name}] Recording at ${speed}× → ${path.relative(ROOT, out)}`);
        // A short beat on the hero before the story starts moving. click()
        // dispatches only a click, which autoplay does not read as scrolling.
        await page.waitForTimeout(1000);
        await heroPlay.evaluate((button) => button.click());

        // Autoplay pauses itself at the end of chapter 09.
        const playButton = page.locator('[data-story-player] button[aria-pressed]');
        await playButton.and(page.locator('[aria-pressed="true"]')).waitFor({ state: 'attached', timeout: 10_000 });
        const started = Date.now();
        const ticker = setInterval(() => {
            process.stdout.write(`\r[record] [${name}] ${Math.round((Date.now() - started) / 1000)}s recorded…`);
        }, 1000);
        try {
            await playButton.and(page.locator('[aria-pressed="false"]')).waitFor({ state: 'attached', timeout: 30 * 60_000 });
        } finally {
            clearInterval(ticker);
            process.stdout.write('\n');
        }

        // Hold the last frame of chapter 09 for a moment.
        await page.waitForTimeout(1500);
        await cdp.send('Page.stopScreencast');
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
