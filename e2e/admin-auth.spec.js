import { test, expect } from '@playwright/test';

// No hardcoded credential fallbacks — the valid-login test below skips unless a
// real ADMIN_PASSWORD is supplied via the environment (e.g. CI secrets).
const USERNAME = process.env.ADMIN_USERNAME || 'admin';
const PASSWORD = process.env.ADMIN_PASSWORD || '';

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

// GitHub-login mode. These run only when the server under test was started with
// GITHUB_AUTH_ENABLED=true; otherwise they skip so the default password-mode
// suite is unaffected.
const githubEnabled = process.env.GITHUB_AUTH_ENABLED === 'true';

test('GitHub mode shows the GitHub button and hides the password form', async ({ page }) => {
  test.skip(!githubEnabled, 'GitHub auth not enabled in env');

  await page.goto('/admin/login');
  await expect(page.getByRole('link', { name: /continue with github/i })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('GitHub callback without a valid state bounces back to login with an error', async ({ page }) => {
  test.skip(!githubEnabled, 'GitHub auth not enabled in env');

  await page.goto('/api/auth/github/callback?code=abc&state=forged');
  await expect(page).toHaveURL(/\/admin\/login\?error=/);
});
