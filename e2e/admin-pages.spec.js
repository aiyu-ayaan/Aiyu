import { test, expect } from '@playwright/test';
import fs from 'fs';

// Every admin page renders for a signed-in admin: one login (the login route is rate-limited to 5 per 5 min),
// then each route from web/dist/admin-routes.json (written by the Vite build), `[id]` filled from real records.
// Read-only: nothing is clicked or saved.

const ROUTES = JSON.parse(fs.readFileSync('web/dist/admin-routes.json', 'utf8'));
const first = (list) => (Array.isArray(list) ? list : list?.data || list?.apps || [])[0];

test.describe.configure({ mode: 'serial' });

let context;
let ids = {};

test.beforeAll(async ({ browser }) => {
    test.skip(!process.env.ADMIN_PASSWORD, 'no ADMIN_PASSWORD configured in env');
    context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', process.env.ADMIN_USERNAME || 'admin');
    await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });

    const get = async (url) => (await page.request.get(url)).json();
    const legalApp = first(await get('/api/legal/apps'));
    const legal = legalApp ? await get(`/api/legal/apps/${legalApp._id}`) : null;
    ids = {
        apps: first(await get('/api/deployments'))?._id,
        projects: first(await get('/api/projects'))?._id,
        blogs: first(await get('/api/blogs'))?._id,
        footer: first(await get('/api/socials'))?._id,
        legal: legalApp?._id,
        legalDoc: (legal?.documents || legal?.data?.documents || [])[0]?._id,
    };
    await page.close();
});

test.afterAll(async () => {
    await context?.close();
});

function resolve(route) {
    const seg = route.split('/');
    const section = seg[2];
    return seg
        .map((s) => (s === '[docId]' ? ids.legalDoc : s.startsWith('[') ? ids[section] : s))
        .join('/');
}

for (const route of ROUTES.filter((r) => r !== '/admin/login')) {
    test(`admin ${route}`, async () => {
        const path = resolve(route);
        test.skip(path.includes('undefined'), `no record to open for ${route}`);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (err) => errors.push(err.message));

        const res = await page.goto(path);
        expect(res.status(), path).toBe(200);
        await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
        await expect(page).not.toHaveTitle('404 - Page Not Found');
        // Something real rendered inside the admin shell (not a blank or crashed tree).
        expect((await page.locator('body').innerText()).trim().length, path).toBeGreaterThan(40);
        expect(errors, path).toEqual([]);
        await page.close();
    });
}

test('old admin paths redirect like the Next pages did', async () => {
    const page = await context.newPage();
    for (const [from, to] of [['/admin/blogs/api', '/admin/api-reference'], ['/admin/deployments', '/admin/apps'], ['/admin/deployments/new', '/admin/apps/new']]) {
        const res = await page.request.get(from, { maxRedirects: 0 });
        expect(res.status(), from).toBe(307);
        expect(new URL(res.headers().location, 'http://x').pathname).toBe(to);
    }
    expect((await page.request.get('/admin/does-not-exist-e2e')).status()).toBe(404);
    await page.close();
});

test('admin writes reach the API through the server (About saved unchanged)', async () => {
    // Every other admin test only reads; a GET-only route once swallowed POST/PUT with a 405.
    const page = await context.newPage();
    const before = await (await page.request.get('/api/about')).json();
    const res = await page.request.put('/api/about', { data: before });
    expect(res.status()).toBe(200);
    const after = await (await page.request.get('/api/about')).json();
    expect(after).toEqual(before);
    expect((await page.request.post('/api/upload', { multipart: {} })).status()).not.toBe(405);
    await page.close();
});
