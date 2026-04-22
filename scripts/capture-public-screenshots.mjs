import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const SITE_APP_DIR = path.join(ROOT, 'src', 'app', '(site)');
const OUTPUT_DIR = path.join(ROOT, 'public', 'screenshots', 'auto');
const BASE_URL = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:3000';
const START_SERVER = process.env.SCREENSHOT_START_SERVER !== 'false';
const SCREENSHOT_PORT = process.env.SCREENSHOT_PORT || '3000';
const WAIT_TIMEOUT_MS = 120000;
const QUICK_REUSE_CHECK_MS = 6000;
const POST_NAV_WAIT_MS = Number.parseInt(process.env.SCREENSHOT_WAIT_MS || '2200', 10);
const AUTO_SCROLL = process.env.SCREENSHOT_AUTO_SCROLL !== 'false';
const VIEWPORT_WIDTH = Number.parseInt(process.env.SCREENSHOT_VIEWPORT_WIDTH || '1920', 10);
const VIEWPORT_HEIGHT = Number.parseInt(process.env.SCREENSHOT_VIEWPORT_HEIGHT || '1080', 10);
const COLOR_SCHEME = process.env.SCREENSHOT_COLOR_SCHEME || 'dark';
const FULL_PAGE = process.env.SCREENSHOT_FULL_PAGE === 'true';
const PRE_CLICK_DELAY_MS = Number.parseInt(process.env.SCREENSHOT_PRE_CLICK_DELAY_MS || '1400', 10);
const CLICK_X = Number.parseInt(process.env.SCREENSHOT_CLICK_X || String(Math.floor(VIEWPORT_WIDTH / 2)), 10);
const CLICK_Y = Number.parseInt(process.env.SCREENSHOT_CLICK_Y || String(Math.floor(VIEWPORT_HEIGHT / 2)), 10);
const ONLY_ROUTES = (process.env.SCREENSHOT_ONLY_ROUTES || '')
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean);

function isDynamicSegment(segment) {
  return segment.includes('[') && segment.includes(']');
}

function cleanRouteSegments(relativeDir) {
  return relativeDir
    .split(path.sep)
    .filter(Boolean)
    .filter((segment) => !segment.startsWith('(') && !segment.endsWith(')'));
}

async function findPageDirectories(baseDir) {
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const directories = [];

  for (const entry of entries) {
    const fullPath = path.join(baseDir, entry.name);

    if (entry.isDirectory()) {
      const nested = await findPageDirectories(fullPath);
      directories.push(...nested);
      continue;
    }

    if (entry.isFile() && entry.name === 'page.js') {
      directories.push(baseDir);
    }
  }

  return directories;
}

async function discoverPublicRoutes() {
  const pageDirs = await findPageDirectories(SITE_APP_DIR);
  const routes = new Set();

  for (const dir of pageDirs) {
    const relativeDir = path.relative(SITE_APP_DIR, dir);
    const segments = cleanRouteSegments(relativeDir === '.' ? '' : relativeDir);

    if (segments.some(isDynamicSegment)) {
      continue;
    }

    const routePath = segments.length === 0 ? '/' : `/${segments.join('/')}`;
    routes.add(routePath);
  }

  const extraRoutes = (process.env.PUBLIC_SCREENSHOT_EXTRA_ROUTES || '')
    .split(',')
    .map((route) => route.trim())
    .filter(Boolean)
    .map((route) => (route.startsWith('/') ? route : `/${route}`));

  for (const route of extraRoutes) {
    routes.add(route);
  }

  return Array.from(routes).sort((a, b) => {
    if (a === '/') return -1;
    if (b === '/') return 1;
    return a.localeCompare(b);
  });
}

function routeToFileName(route) {
  if (route === '/') return 'home.png';
  return `${route.replace(/^\//, '').replace(/[\\/:*?"<>|]+/g, '-').replace(/-+/g, '-')}.png`;
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // Ignore until server becomes available.
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  throw new Error(`Server did not become ready within ${Math.floor(timeoutMs / 1000)} seconds.`);
}

async function waitForPageToRender(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {
    // Some pages may keep background requests alive; continue.
  });

  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  });

  await page.waitForFunction(() => {
    const main = document.querySelector('main');
    if (main) {
      const textLength = (main.textContent || '').trim().length;
      const height = main.getBoundingClientRect().height;
      return textLength > 50 || height > 180;
    }
    return (document.body?.textContent || '').trim().length > 50;
  }, { timeout: 45000 }).catch(() => {
    // If this times out, we still continue and take a best-effort screenshot.
  });

  await page.waitForTimeout(POST_NAV_WAIT_MS);
}

async function autoScrollForLazyContent(page) {
  await page.evaluate(async () => {
    const step = Math.max(220, Math.floor(window.innerHeight * 0.7));
    await new Promise((resolve) => {
      let lastPosition = -1;
      let stableTicks = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        const currentPosition = window.scrollY;
        const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 5;

        if (atBottom || currentPosition === lastPosition) {
          stableTicks += 1;
        } else {
          stableTicks = 0;
        }

        lastPosition = currentPosition;

        if (stableTicks >= 2) {
          clearInterval(timer);
          resolve();
        }
      }, 220);
    });
  });

  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  await page.waitForTimeout(600);
}

async function waitForImages(page) {
  await page.evaluate(async () => {
    const images = Array.from(document.images || []);
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      })
    );
  });
}

function startDevServer() {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm run dev']
    : ['run', 'dev'];

  const child = spawn(command, args, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: {
      ...process.env,
      PORT: SCREENSHOT_PORT,
    },
  });

  child.on('error', (error) => {
    console.error('[dev] Failed to start dev server:', error.message);
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[dev] ${chunk}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[dev] ${chunk}`);
  });

  return child;
}

async function waitForServerOrExit(url, timeoutMs, childProcess) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (childProcess && childProcess.exitCode !== null) {
      throw new Error(
        `Dev server exited before becoming ready (exit code ${childProcess.exitCode}). ` +
        `If your app is already running, use SCREENSHOT_START_SERVER=false.`
      );
    }

    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // Keep waiting
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  throw new Error(`Server did not become ready within ${Math.floor(timeoutMs / 1000)} seconds.`);
}

async function clickBeforeCapture(page) {
  if (PRE_CLICK_DELAY_MS > 0) {
    await page.waitForTimeout(PRE_CLICK_DELAY_MS);
  }

  await page.mouse.click(CLICK_X, CLICK_Y);
  await page.waitForTimeout(350);
}

async function capturePublicScreenshots() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const routes = await discoverPublicRoutes();
  const filteredRoutes = ONLY_ROUTES.length
    ? routes.filter((route) => ONLY_ROUTES.includes(route))
    : routes;

  if (filteredRoutes.length === 0) {
    throw new Error('No public routes found under src/app/(site).');
  }

  let devServer = null;
  let isShuttingDown = false;

  const shutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    if (devServer && !devServer.killed && devServer.exitCode === null) {
      if (process.platform === 'win32') {
        devServer.kill();
      } else {
        devServer.kill('SIGTERM');
      }
    }
  };

  process.once('SIGINT', () => {
    console.log('\nInterrupted. Shutting down screenshot runner...');
    shutdown();
    process.exit(130);
  });

  process.once('SIGTERM', () => {
    shutdown();
    process.exit(143);
  });

  try {
    if (START_SERVER) {
      let reusedRunningServer = false;

      try {
        await waitForServer(BASE_URL, QUICK_REUSE_CHECK_MS);
        reusedRunningServer = true;
        console.log(`Using already running server at ${BASE_URL}`);
      } catch {
        console.log('Starting Next.js dev server...');
      }

      if (!reusedRunningServer) {
        devServer = startDevServer();
        await waitForServerOrExit(BASE_URL, WAIT_TIMEOUT_MS, devServer);
      }
    } else {
      console.log('Using existing server at', BASE_URL);
      await waitForServer(BASE_URL, WAIT_TIMEOUT_MS);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT } });
    await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: COLOR_SCHEME === 'light' ? 'light' : 'dark' });

    console.log(`Capturing ${filteredRoutes.length} route(s)...`);

    for (const route of filteredRoutes) {
      const url = new URL(route, BASE_URL).toString();
      const fileName = routeToFileName(route);
      const screenshotPath = path.join(OUTPUT_DIR, fileName);

      console.log(`- ${route} -> ${path.relative(ROOT, screenshotPath)}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await waitForPageToRender(page);
      if (AUTO_SCROLL) {
        await autoScrollForLazyContent(page);
      }
      await waitForImages(page);
      await clickBeforeCapture(page);
      await page.screenshot({ path: screenshotPath, fullPage: FULL_PAGE });
    }

    await browser.close();
    console.log('Done. Screenshots saved in public/screenshots/auto');
  } finally {
    shutdown();
  }
}

capturePublicScreenshots().catch((error) => {
  console.error('Screenshot capture failed:', error.message);
  process.exit(1);
});
