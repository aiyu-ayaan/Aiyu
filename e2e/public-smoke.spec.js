import { test, expect } from '@playwright/test';

const routes = ['/', '/about-me', '/projects', '/apps', '/blogs', '/gallery', '/github', '/contact-us'];

for (const path of routes) {
  test(`renders ${path} without severe errors`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response, `no response for ${path}`).toBeTruthy();
    expect(response.status(), `bad status for ${path}`).toBeLessThan(400);

    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveTitle(/.+/);

    expect(errors, `uncaught page errors on ${path}: ${errors.join('; ')}`).toEqual([]);
  });
}
