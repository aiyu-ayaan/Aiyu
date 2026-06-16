import { test, expect } from '@playwright/test';

const USERNAME = process.env.ADMIN_USERNAME || 'aiyu';
const PASSWORD = process.env.ADMIN_PASSWORD || '1501@AiyuLoveAnshu^2401!!';

test('rejects wrong credentials', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('input[type="text"]', 'wronguser');
  await page.fill('input[type="password"]', 'wrongpass');
  await page.click('button[type="submit"]');

  await expect(page.getByText(/invalid credentials|login failed/i)).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('logs in with valid credentials and reaches the dashboard', async ({ page }) => {
  test.skip(!process.env.ADMIN_PASSWORD, 'no ADMIN_PASSWORD configured in env');

  await page.goto('/admin/login');
  await page.fill('input[type="text"]', USERNAME);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/admin(\/|$)/, { timeout: 15_000 });
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});
