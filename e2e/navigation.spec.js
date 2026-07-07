import { test, expect } from '@playwright/test';

test('navigates between pages via header links', async ({ page }) => {
  await page.goto('/');

  // Target the site header by its landmark role. The v2 boot loader renders a
  // decorative `<header class="boot2-topbar" aria-hidden="true">` in the root
  // layout, so a bare `header` selector matches two elements; `banner` excludes
  // the aria-hidden one and resolves to the real header on both classic and v2.
  const header = page.getByRole('banner');
  await expect(header).toBeVisible();

  // The desktop header always renders a Projects link and a logo link home.
  await header.locator('a[href="/projects"]').first().click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator('body')).toBeVisible();

  // Click the logo to return home.
  await header.locator('a[href="/"]').first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('body')).toBeVisible();
});
