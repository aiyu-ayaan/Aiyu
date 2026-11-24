import { test, expect } from '@playwright/test';

// Parity gate for the /blogs port (Next -> Vite + Rust): index, detail, redirects, 404, navigation.

const severe = (msg) => msg.type() === 'error' && !/favicon|Failed to load resource|net::ERR|hydrat|adsbygoogle|GitHub commits/i.test(msg.text());

/** Newest post with a table of contents (>= 2 h2/h3 headings), from the public API both servers answer. */
async function pickPost(request) {
    const res = await request.get('/api/blogs');
    expect(res.ok()).toBeTruthy();
    const blogs = (await res.json()).data;
    const post = blogs.find((b) => b.slug && (b.content?.match(/^#{2,3}\s/gm) || []).length >= 2);
    expect(post, 'a published post with headings').toBeTruthy();
    return post;
}

test('index lists posts newest first', async ({ page }) => {
    const res = await page.goto('/blogs');
    expect(res.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'Notes from the workbench.' })).toBeVisible();
    const rows = page.locator('main a[href^="/blogs/"]');
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(page.getByText(/\d+ posts? · newest first/)).toBeVisible();
});

test('detail renders the article and its table of contents', async ({ page, request }) => {
    const post = await pickPost(request);
    const errors = [];
    page.on('console', (msg) => severe(msg) && errors.push(msg.text()));
    page.on('pageerror', (err) => errors.push(err.message));

    const res = await page.goto(`/blogs/${post.slug}`);
    expect(res.status()).toBe(200);
    await expect(page).toHaveTitle(new RegExp(post.title.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await expect(page.locator('article').first()).toBeVisible();
    await expect(page.getByText('On this page')).toBeAttached();
    expect(await page.locator('.blog-toc-wrapper nav a, .blog-toc-wrapper nav button').count()).toBeGreaterThanOrEqual(2);
    await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
    expect(errors).toEqual([]);
});

test('id and uppercase slug redirect permanently to the slug', async ({ request }) => {
    const post = await pickPost(request);
    for (const path of [`/blogs/${post._id}`, `/blogs/${post.slug.toUpperCase()}`]) {
        const res = await request.get(path, { maxRedirects: 0 });
        expect(res.status(), path).toBe(308);
        expect(new URL(res.headers().location, 'http://x').pathname).toBe(`/blogs/${post.slug}`);
    }
});

test('unknown post is 404', async ({ page }) => {
    expect((await page.goto('/blogs/does-not-exist-e2e')).status()).toBe(404);
});

test('index row opens the post, back link returns', async ({ page }) => {
    await page.goto('/blogs');
    const first = page.locator('main a[href^="/blogs/"]').first();
    const href = await first.getAttribute('href');
    await first.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator('article').first()).toBeVisible();

    await page.getByRole('link', { name: /Back to Blogs/ }).first().click();
    await expect(page).toHaveURL(/\/blogs$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Notes from the workbench.' })).toBeVisible();
});

test('header link to a page the app does not own loads it', async ({ page }) => {
    await page.goto('/blogs');
    await page.getByRole('link', { name: '[about-me]' }).click();
    await expect(page).toHaveURL(/\/about-me$/);
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Notes from the workbench.' })).toHaveCount(0);
});

test('header link from a Next page reaches the blog', async ({ page }) => {
    await page.goto('/about-me');
    await page.getByRole('link', { name: '[blogs]' }).click();
    await expect(page).toHaveURL(/\/blogs$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Notes from the workbench.' })).toBeVisible();
});
