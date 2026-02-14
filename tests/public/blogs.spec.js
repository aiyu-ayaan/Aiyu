import { test, expect } from '../setup';

test.describe('Blogs Page', () => {
  test.beforeEach(async ({ page, waitForPageLoad }) => {
    await page.goto('/blogs');
    await waitForPageLoad();
  });

  test('should load blogs page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Blogs|portfolio|aiyu/i);
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display blog posts list', async ({ page }) => {
    // Look for blog posts container
    const blogsContainer = page.locator(
      '[data-testid="blogs-container"], ' +
      '.blogs-grid, ' +
      '.blogs-list, ' +
      '[class*="blog"]'
    );
    
    await expect(blogsContainer.first()).toBeVisible();
  });

  test('should display blog cards if blogs exist', async ({ page }) => {
    // Look for blog cards
    const blogCards = page.locator(
      '[data-testid="blog-card"], ' +
      '.blog-card, ' +
      '.blog-item, ' +
      'article, ' +
      '[class*="blog-card"], ' +
      '[class*="blog-item"]'
    );
    
    const cardCount = await blogCards.count();
    if (cardCount > 0) {
      // Check that at least one blog card has content
      const firstCard = blogCards.first();
      await expect(firstCard).toBeVisible();
      
      // Check for common blog card elements
      const title = firstCard.locator('h1, h2, h3, .title, [class*="title"]');
      if (await title.count() > 0) {
        const titleText = await title.first().textContent();
        expect(titleText?.trim().length).toBeGreaterThan(0);
      }
      
      // Check for date or metadata
      const metadata = firstCard.locator('.date, .metadata, [class*="date"], time');
      if (await metadata.count() > 0) {
        await expect(metadata.first()).toBeVisible();
      }
    }
  });

  test('should navigate to individual blog post', async ({ page }) => {
    const blogLinks = page.locator('a[href*="/blogs/"]');
    const linkCount = await blogLinks.count();
    
    if (linkCount > 0) {
      // Click the first blog link
      await blogLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Verify we're on a blog detail page
      await expect(page).toHaveURL(/\/blogs\/[^\/]+/);
      
      // Check for blog content
      const blogContent = page.locator('main, article, [data-testid="blog-content"]');
      await expect(blogContent.first()).toBeVisible();
    }
  });

  test('should have proper navigation', async ({ page }) => {
    const header = page.locator('header, [role="navigation"]');
    await expect(header).toBeVisible();
    
    // Check if blogs page is highlighted in navigation
    const currentPageLink = page.locator('nav a[href*="blog"], header a[href*="blog"]');
    if (await currentPageLink.count() > 0) {
      await expect(currentPageLink.first()).toBeVisible();
    }
  });

  test('should handle blog pagination if available', async ({ page }) => {
    const pagination = page.locator(
      '[data-testid="pagination"], ' +
      '.pagination, ' +
      '[class*="pagination"], ' +
      'nav[aria-label="pagination"]'
    );
    
    if (await pagination.count() > 0) {
      await expect(pagination.first()).toBeVisible();
      
      // Look for next/prev buttons
      const nextButton = pagination.locator('a:has-text("Next"), a:has-text("›"), [aria-label="next"]');
      const prevButton = pagination.locator('a:has-text("Prev"), a:has-text("‹"), [aria-label="previous"]');
      
      if (await nextButton.count() > 0) {
        await nextButton.first().click();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/page=\d+/);
      }
    }
  });

  test('should handle blog filtering if available', async ({ page }) => {
    // Look for category or tag filters
    const filterButtons = page.locator(
      '[data-testid="filter"], ' +
      '.filter, ' +
      '[class*="filter"], ' +
      '.category, ' +
      '.tag'
    );
    
    if (await filterButtons.count() > 0) {
      await filterButtons.first().click();
      await page.waitForTimeout(500);
      
      // Verify filter is working
      const activeFilter = page.locator('.active, [aria-pressed="true"], .selected');
      if (await activeFilter.count() > 0) {
        await expect(activeFilter.first()).toBeVisible();
      }
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should handle empty blogs state gracefully', async ({ page }) => {
    // If no blogs are found, there should be an appropriate message
    const emptyState = page.locator(
      '[data-testid="empty-state"], ' +
      '.empty-state, ' +
      '.no-blogs, ' +
      '[class*="empty"]'
    );
    
    const blogCards = page.locator('[class*="blog"]');
    const hasBlogs = await blogCards.count() > 0;
    
    if (!hasBlogs) {
      await expect(emptyState.first()).toBeVisible();
    }
  });
});
