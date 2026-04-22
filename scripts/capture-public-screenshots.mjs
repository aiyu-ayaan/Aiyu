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

async function capturePublicScreenshots() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const routes = await discoverPublicRoutes();
  if (routes.length === 0) {
    throw new Error('No public routes found under src/app/(site).');
  }

  let devServer = null;

  try {
    if (START_SERVER) {
      console.log('Starting Next.js dev server...');
      devServer = startDevServer();
      await waitForServer(BASE_URL, WAIT_TIMEOUT_MS);
    } else {
      console.log('Using existing server at', BASE_URL);
      await waitForServer(BASE_URL, WAIT_TIMEOUT_MS);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1720, height: 980 } });

    console.log(`Capturing ${routes.length} route(s)...`);

    for (const route of routes) {
      const url = new URL(route, BASE_URL).toString();
      const fileName = routeToFileName(route);
      const screenshotPath = path.join(OUTPUT_DIR, fileName);

      console.log(`- ${route} -> ${path.relative(ROOT, screenshotPath)}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }

    await browser.close();
    console.log('Done. Screenshots saved in public/screenshots/auto');
  } finally {
    if (devServer && !devServer.killed) {
      if (process.platform === 'win32') {
        devServer.kill();
      } else {
        devServer.kill('SIGTERM');
      }
    }
  }
}

capturePublicScreenshots().catch((error) => {
  console.error('Screenshot capture failed:', error.message);
  process.exit(1);
});
