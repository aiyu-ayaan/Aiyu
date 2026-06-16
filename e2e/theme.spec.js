import { test, expect } from '@playwright/test';

test('theme toggle flips data-theme and persists', async ({ page }) => {
  await page.goto('/');

  // The toggle button exposes an aria-label starting with "Theme mode:".
  const toggle = page.getByRole('button', { name: /Theme mode:/i }).first();
  await expect(toggle).toBeVisible();

  const before = await page.locator('html').getAttribute('data-theme');

  // One click resolves from the system-derived default to an explicit variant.
  // If the resolved variant happens to equal the current one, click again.
  await toggle.click();
  let after = await page.locator('html').getAttribute('data-theme');
  if (after === before) {
    await toggle.click();
    after = await page.locator('html').getAttribute('data-theme');
  }
  expect(after).not.toBe(before);

  await page.reload();
  await expect
    .poll(async () => page.locator('html').getAttribute('data-theme'))
    .toBe(after);
});
