import { test, expect } from '@playwright/test';

// Parity gate for the public section pages ported from Next to Vite + Rust. Runs against either server.

const severe = (msg) => msg.type() === 'error' && !/favicon|Failed to load resource|net::ERR|hydrat|adsbygoogle|GitHub commits|github/i.test(msg.text());

// [path, <title> pattern, extra check]
const PAGES = [
    ['/', /\| .* Portfolio$/, async (page, request) => {
        const home = await (await request.get('/api/home')).json();
        if (home?.name) await expect(page.getByText(home.name, { exact: false }).first()).toBeAttached();
    }],
    ['/about-me', /^About Me \| /, async (page, request) => {
        const about = await (await request.get('/api/about')).json();
        await expect(page.getByText(about.name, { exact: false }).first()).toBeVisible();
    }],
    ['/apps', /^Apps \| /, async (page, request) => {
        // Rows reveal on scroll: check they rendered, not that they are on screen.
        const [first] = await (await request.get('/api/deployments')).json();
        await expect(page.getByText(first.name, { exact: false }).first()).toBeAttached();
    }],
    ['/projects', /^Open Source & Community \| /, async (page, request) => {
        const [first] = await (await request.get('/api/projects')).json();
        await expect(page.getByText(first.name, { exact: false }).first()).toBeAttached();
    }],
    ['/gallery', /^Gallery \| /, async (page) => {
        await expect(page.locator('main img').first()).toBeVisible({ timeout: 15_000 });
    }],
    // Stats come from the GitHub API in the browser: only the shell is checked (the API may be rate-limited).
    ['/github', /^GitHub \| /, async () => {}],
    // Never submitted: it writes a ContactMessage and can send real notifications.
    ['/contact-us', /^Contact \| /, async (page) => {
        await expect(page.locator('form textarea').first()).toBeVisible();
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
        if (path !== '/github') await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
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
    await expect(page).toHaveTitle(/^About Me \| /);
    await page.getByRole('link', { name: '[blogs]' }).click();
    await expect(page).toHaveURL(/\/blogs$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Notes from the workbench.' })).toBeVisible();
});

for (const [kind, api] of [['projects', '/api/projects'], ['apps', '/api/deployments']]) {
    test(`/${kind}/<slug> renders, id redirects, unknown is 404`, async ({ page, request }) => {
        const [first] = await (await request.get(api)).json();
        const res = await page.goto(`/${kind}/${first.slug}`);
        expect(res.status()).toBe(200);
        await expect(page).toHaveTitle(new RegExp(`^${first.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} — `));
        await expect(page.getByText(first.name).first()).toBeAttached();
        await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(2);

        const byId = await request.get(`/${kind}/${first._id}`, { maxRedirects: 0 });
        expect(byId.status()).toBe(308);
        expect(new URL(byId.headers().location, 'http://x').pathname).toBe(`/${kind}/${first.slug}`);
        expect((await request.get(`/${kind}/does-not-exist-e2e`)).status()).toBe(404);
    });
}

test('index card opens the project, back link returns', async ({ page, request }) => {
    const [first] = await (await request.get('/api/projects')).json();
    await page.goto('/projects');
    const card = page.locator(`a[href="/projects/${first.slug}"]`).first();
    // Rows reveal on scroll (GSAP): bring the card on screen first.
    await card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await card.click();
    await expect(page).toHaveURL(new RegExp(`/projects/${first.slug}$`));
    await expect(page.getByText(first.name).first()).toBeAttached();
});

test('/ai hub and a section sub-page render, unknown section is 404', async ({ page, request }) => {
    const errors = [];
    page.on('console', (msg) => severe(msg) && errors.push(msg.text()));
    page.on('pageerror', (err) => errors.push(err.message));

    expect((await page.goto('/ai')).status()).toBe(200);
    await expect(page).toHaveTitle(/^AI Hub \| /);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });

    expect((await page.goto('/ai/stack')).status()).toBe(200);
    await expect(page.locator('main h2, main h1').first()).toBeAttached();
    await page.locator('main a[href="/ai"]').first().click();
    await expect(page).toHaveURL(/\/ai$/);
    await expect(page).toHaveTitle(/^AI Hub \| /);

    expect((await request.get('/ai/does-not-exist-e2e')).status()).toBe(404);
    expect(errors).toEqual([]);
});

test('/sitemap lists every page', async ({ page, request }) => {
    const [projects, apps, blogs] = await Promise.all(['/api/projects', '/api/deployments', '/api/blogs'].map(async (u) => request.get(u).then((r) => r.json())));
    const res = await page.goto('/sitemap');
    expect(res.status()).toBe(200);
    await expect(page).toHaveTitle(/\| HTML Sitemap$/);
    const games = 9; // visible cabinets (games.spec.js)
    const total = 9 + apps.length + projects.length + games + blogs.data.length;
    await expect(page.getByText(`${total} entries · 5 sections`)).toBeVisible();
});

test('legal app and document pages render; other single-segment paths still work', async ({ page, request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    const known = /^\/(projects|apps|blogs|ai|games|gallery|github|about-me|contact-us|desktop)(\/|$)/;
    const paths = [...xml.matchAll(/<loc>[^<]*?\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]).filter((p) => !known.test(p));
    const doc = paths.find((p) => p.split('/').length === 3);
    test.skip(!doc, 'no published legal document in this database');
    const appPath = doc.split('/').slice(0, 2).join('/');

    expect((await page.goto(appPath)).status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
    await page.locator(`a[href="${doc}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${doc}$`));
    await expect(page.locator('h1').first()).toBeVisible();

    expect((await request.get(`${appPath}/does-not-exist-e2e`)).status()).toBe(404);
    expect((await request.get('/does-not-exist-e2e')).status()).toBe(404);
    expect((await request.get('/robots.txt')).status()).toBe(200);
    expect((await request.get('/api/health')).status()).toBe(200);
});

test('/desktop boots the Aiyu OS shell', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    expect((await page.goto('/desktop')).status()).toBe(200);
    await expect(page).toHaveTitle('Aiyu OS — a desktop environment in the browser');
    await expect(page.getByRole('heading', { level: 1, name: /Aiyu OS/ })).toBeAttached();
    await page.waitForTimeout(3000);
    expect((await page.locator('button').count())).toBeGreaterThan(3);
    expect(errors).toEqual([]);
});
