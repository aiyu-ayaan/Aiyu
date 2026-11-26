#!/usr/bin/env node
// Screenshots of admin pages in both theme variants, desktop and phone width, with the console errors of each.
// Usage: node --env-file=.env scripts/perf/admin-shots.mjs <out dir> [--base url] /admin /admin/blogs ...
import { chromium } from '@playwright/test';

const [out, ...rest] = process.argv.slice(2);
const base = rest.includes('--base') ? rest[rest.indexOf('--base') + 1] : 'http://localhost:8080';
const routes = rest.filter((r) => r.startsWith('/'));
const browser = await chromium.launch();
const context = await browser.newContext();
const login = await context.request.post(`${base}/api/auth/login`, { multipart: { username: process.env.ADMIN_USERNAME || '', password: process.env.ADMIN_PASSWORD || '' }, headers: { 'x-real-ip': '198.51.100.77' } });
if (!login.ok()) throw new Error(`login failed (${login.status()})`);
for (const theme of ['dark', 'light']) {
    for (const [size, viewport] of [['desk', { width: 1366, height: 860 }], ['phone', { width: 375, height: 760 }]]) {
        for (const route of routes) {
            const page = await context.newPage();
            await page.setViewportSize(viewport);
            await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
            await page.addInitScript((mode) => { localStorage.setItem('theme-mode', mode); localStorage.setItem('themeMode', mode); }, theme);
            const errors = [];
            page.on('pageerror', (e) => errors.push(e.message));
            await page.goto(base + route);
            await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
            await page.waitForTimeout(500);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
            const name = `${route.replace(/[^a-z0-9]+/gi, '_').replace(/^_/, '')}-${size}-${theme}.png`;
            await page.screenshot({ path: `${out}/${name}` });
            const applied = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
            console.log(`${name} theme=${applied} overflow=${overflow > 0 ? overflow : 0}${errors.length ? ` errors=${errors.join('; ').slice(0, 300)}` : ''}`);
            await page.close();
        }
    }
}
await browser.close();
