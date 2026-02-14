import { test, expect } from '../setup';

test.describe('About Page', () => {
  test.beforeEach(async ({ page, waitForPageLoad }) => {
    await page.goto('/about-me');
    await waitForPageLoad();
  });

  test('should load about page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/About|portfolio|aiyu/i);
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display about content', async ({ page }) => {
    // Look for about content sections
    const aboutContent = page.locator('[data-testid="about-content"], .about-content, main > div');
    await expect(aboutContent.first()).toBeVisible();
  });

  test('should have proper navigation', async ({ page }) => {
    const header = page.locator('header, [role="navigation"]');
    await expect(header).toBeVisible();
    
    // Check if current page is highlighted in navigation
    const currentPageLink = page.locator('nav a[href*="about"], header a[href*="about"]');
    if (await currentPageLink.count() > 0) {
      await expect(currentPageLink.first()).toBeVisible();
    }
  });

  test('should display personal information', async ({ page }) => {
    // Look for common about page elements
    const possibleSelectors = [
      '[data-testid="name"]',
      '.name',
      '.title',
      '.profession',
      'h1', 
      'h2',
      '.bio',
      '.description'
    ];
    
    let foundContent = false;
    for (const selector of possibleSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        const text = await element.first().textContent();
        if (text && text.trim().length > 0) {
          foundContent = true;
          break;
        }
      }
    }
    
    expect(foundContent).toBe(true);
  });

  test('should have working footer', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should navigate back to home', async ({ page }) => {
    const homeLink = page.locator('a[href="/"], a[href="/home"], nav a:first-child');
    if (await homeLink.count() > 0) {
      await homeLink.first().click();
      await page.waitForURL('**/');
      await expect(page).toHaveURL(/\/$/);
    }
  });
});
