import { test, expect } from '@playwright/test';

test('navigates between pages via header links', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('header');
  await expect(header).toBeVisible();

  // The desktop header always renders a Projects link and a logo link home.
  await header.locator('a[href="/projects"]').first().click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator('body')).toBeVisible();

  // Click the logo to return home.
  await page.locator('header a[href="/"]').first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('body')).toBeVisible();
});
