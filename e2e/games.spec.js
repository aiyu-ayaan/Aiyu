import { test, expect } from '@playwright/test';

// Parity gate for the /games port (Next -> Vite + Rust): same cards, cabinets mount, status codes, navigation.

const severe = (msg) => msg.type() === 'error' && !/favicon|Failed to load resource|net::ERR|hydrat|GitHub commits/i.test(msg.text());

test('menu lists every visible cabinet', async ({ page }) => {
    const res = await page.goto('/games');
    expect(res.status()).toBe(200);
    await expect(page).toHaveTitle(/Aiyu Arcade/);
    await expect(page.getByRole('heading', { name: 'AIYU ARCADE' })).toBeVisible();
    const cards = page.getByRole('region', { name: 'Game cabinets' }).getByRole('link');
    await expect(cards).toHaveCount(9);
    await expect(cards.filter({ hasText: 'DOOM' })).toHaveCount(0); // hidden cabinet
});

test('a cabinet mounts its game without severe errors', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => severe(msg) && errors.push(msg.text()));
    page.on('pageerror', (err) => errors.push(err.message));

    const res = await page.goto('/games/tetris');
    expect(res.status()).toBe(200);
    await expect(page).toHaveTitle('TETRIS | Aiyu Arcade');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 });
    expect(errors).toEqual([]);
});

test('menu card opens the cabinet, exit returns home', async ({ page }) => {
    await page.goto('/games');
    await page.getByRole('link', { name: /SNAKE/ }).click();
    await expect(page).toHaveURL(/\/games\/snake$/);
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 });

    await page.goto('/games');
    await page.getByRole('link', { name: /EXIT ARCADE/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('main').first()).toBeVisible();
});

test('unknown and hidden cabinets are 404', async ({ page }) => {
    expect((await page.goto('/games/does-not-exist')).status()).toBe(404);
    expect((await page.goto('/games/doom')).status()).toBe(404);
});

test('navigating from a Next page into the arcade works', async ({ page }) => {
    await page.goto('/sitemap');
    await page.evaluate(() => {
        const a = document.createElement('a');
        a.href = '/games';
        a.textContent = 'to-arcade';
        a.id = 'e2e-to-arcade';
        document.body.appendChild(a);
    });
    await page.click('#e2e-to-arcade');
    await expect(page).toHaveURL(/\/games$/);
    await expect(page.getByRole('heading', { name: 'AIYU ARCADE' })).toBeVisible();
});
