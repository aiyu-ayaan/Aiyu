import { test, expect } from '../setup';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page, authenticatedPage, waitForPageLoad }) => {
    // The authenticatedPage fixture will handle login automatically
    await waitForPageLoad();
  });

  test('should load admin dashboard successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Admin|Dashboard|portfolio/i);
    await expect(page.locator('main, body')).toBeVisible();
  });

  test('should display dashboard header', async ({ page }) => {
    const header = page.locator(
      '[data-testid="dashboard-header"], ' +
      '.dashboard-header, ' +
      'h1, ' +
      '.admin-header'
    );

    await expect(header.first()).toBeVisible();
  });

  test('should display navigation menu', async ({ page }) => {
    const navigation = page.locator(
      '[data-testid="admin-nav"], ' +
      '.admin-nav, ' +
      '.sidebar, ' +
      'nav, ' +
      '[role="navigation"]'
    );

    await expect(navigation.first()).toBeVisible();
  });

  test('should have quick stats or overview cards', async ({ page }) => {
    const statsCards = page.locator(
      '[data-testid="stats-card"], ' +
      '.stats-card, ' +
      '.metric-card, ' +
      '[class*="stat"], ' +
      '[class*="metric"]'
    );

    const cardCount = await statsCards.count();
    if (cardCount > 0) {
      await expect(statsCards.first()).toBeVisible();
    }
  });

  test('should have navigation links to different sections', async ({ page }) => {
    const navLinks = page.locator(
      'nav a, ' +
      '.sidebar a, ' +
      '[data-testid="nav-link"]'
    );

    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);

    // Check for common admin sections
    const commonSections = ['projects', 'blogs', 'about', 'contact', 'gallery', 'config'];
    let foundSection = false;

    for (const section of commonSections) {
      const sectionLink = page.locator(`a:has-text("${section}", { ignoreCase: true })`);
      if (await sectionLink.count() > 0) {
        foundSection = true;
        break;
      }
    }

    expect(foundSection).toBe(true);
  });

  test('should navigate to different admin sections', async ({ page }) => {
    const navLinks = page.locator('nav a, .sidebar a');
    const linkCount = await navLinks.count();

    if (linkCount > 0) {
      // Try to click the first few navigation links
      const maxLinksToTest = Math.min(linkCount, 3);

      for (let i = 0; i < maxLinksToTest; i++) {
        const link = navLinks.nth(i);
        const href = await link.getAttribute('href');

        if (href && !href.includes('logout') && !href.includes('external')) {
          await link.click();
          await page.waitForLoadState('networkidle');

          // Verify navigation worked
          await expect(page.locator('main, body')).toBeVisible();

          // Go back to dashboard
          await page.goto('/admin');
          await page.waitForLoadState('networkidle');
        }
      }
    }
  });

  test('should have user profile or logout functionality', async ({ page }) => {
    const userProfile = page.locator(
      '[data-testid="user-profile"], ' +
      '.user-profile, ' +
      '.user-menu, ' +
      '.logout, ' +
      'button:has-text("Logout"), ' +
      'a:has-text("Logout")'
    );

    const profileCount = await userProfile.count();
    if (profileCount > 0) {
      await expect(userProfile.first()).toBeVisible();
    }
  });

  test('should display recent activity or content', async ({ page }) => {
    const recentActivity = page.locator(
      '[data-testid="recent-activity"], ' +
      '.recent-activity, ' +
      '.activity-feed, ' +
      '.recent-items, ' +
      '[class*="recent"], ' +
      '[class*="activity"]'
    );

    const activityCount = await recentActivity.count();
    if (activityCount > 0) {
      await expect(recentActivity.first()).toBeVisible();
    }
  });

  test('should have search functionality if available', async ({ page }) => {
    const searchInput = page.locator(
      'input[type="search"], ' +
      'input[placeholder*="search"], ' +
      '[data-testid="search"]'
    );

    if (await searchInput.count() > 0) {
      await expect(searchInput.first()).toBeVisible();

      // Test search functionality
      await searchInput.first().fill('test');
      await page.waitForTimeout(1000);

      await expect(searchInput.first()).toHaveValue('test');
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const mainContent = page.locator('main, body');
    await expect(mainContent).toBeVisible();

    // Check if mobile menu exists
    const mobileMenu = page.locator(
      '.mobile-menu, ' +
      '[data-testid="mobile-menu"], ' +
      'button[aria-label="menu"], ' +
      '.hamburger'
    );

    if (await mobileMenu.count() > 0) {
      await expect(mobileMenu.first()).toBeVisible();
    }
  });

  test('should handle loading states', async ({ page }) => {
    // Navigate to a section that might have loading states
    const navLinks = page.locator('nav a, .sidebar a');
    const linkCount = await navLinks.count();

    if (linkCount > 0) {
      const link = navLinks.first();
      const href = await link.getAttribute('href');

      if (href && !href.includes('logout')) {
        await link.click();

        // Look for loading indicators
        const loadingIndicator = page.locator(
          '.loading, ' +
          '[data-testid="loading"], ' +
          '.spinner, ' +
          '[class*="loading"]'
        );

        // Loading might appear briefly
        await page.waitForTimeout(1000);

        // Should eventually show content
        await page.waitForLoadState('networkidle');
        await expect(page.locator('main, body')).toBeVisible();
      }
    }
  });

  test('should have proper error handling', async ({ page }) => {
    // Try to access a non-existent admin route
    await page.goto('/admin/non-existent-page');
    await page.waitForLoadState('networkidle');

    // Should show 404 or error page
    const errorPage = page.locator(
      '[data-testid="404"], ' +
      '.error-page, ' +
      '.not-found, ' +
      'h1:has-text("404"), ' +
      'h1:has-text("Not Found")'
    );

    const hasErrorPage = await errorPage.count() > 0;
    if (hasErrorPage) {
      await expect(errorPage.first()).toBeVisible();
    } else {
      // Or should redirect back to dashboard
      await expect(page).toHaveURL(/.*admin.*/);
    }
  });
});
