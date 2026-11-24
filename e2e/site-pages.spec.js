import { test, expect } from '@playwright/test';

// Parity gate for the public section pages ported from Next to Vite + Rust. Runs against either server.

const severe = (msg) => msg.type() === 'error' && !/favicon|Failed to load resource|net::ERR|hydrat|adsbygoogle|GitHub commits|github/i.test(msg.text());

// [path, <title> pattern, extra check]
const PAGES = [
    ['/about-me', /\| About Me$/, async (page, request) => {
        const about = await (await request.get('/api/about')).json();
        await expect(page.getByText(about.name, { exact: false }).first()).toBeVisible();
    }],
];

for (const [path, title, check] of PAGES) {
    test(`${path} renders`, async ({ page, request }) => {
        const errors = [];
        page.on('console', (msg) => severe(msg) && errors.push(msg.text()));
        page.on('pageerror', (err) => errors.push(err.message));

        const res = await page.goto(path);
        expect(res.status()).toBe(200);
        await expect(page).toHaveTitle(title);
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
        await check(page, request);
        expect(errors).toEqual([]);
    });

    test(`${path} answers markdown to agents`, async ({ request }) => {
        const res = await request.get(path, { headers: { accept: 'text/markdown' } });
        expect(res.headers()['content-type']).toContain('text/markdown');
        expect(await res.text()).toContain(`Canonical path: ${path}`);
    });
}

test('header nav moves between ported pages and updates the title', async ({ page, request }) => {
    test.skip((await request.get('/blogs')).status() !== 200, 'needs the Rust server (Next no longer has /blogs)');
    await page.goto('/blogs');
    await page.getByRole('link', { name: '[about-me]' }).click();
    await expect(page).toHaveURL(/\/about-me$/);
    await expect(page).toHaveTitle(/\| About Me$/);
    await page.getByRole('link', { name: '[blogs]' }).click();
    await expect(page).toHaveURL(/\/blogs$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Notes from the workbench.' })).toBeVisible();
});
