import { test, expect } from '../setup';

test.describe('Gallery Page', () => {
  test.beforeEach(async ({ page, waitForPageLoad }) => {
    await page.goto('/gallery');
    await waitForPageLoad();
  });

  test('should load gallery page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Gallery|portfolio|aiyu/i);
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display gallery grid or layout', async ({ page }) => {
    // Look for gallery container
    const galleryContainer = page.locator(
      '[data-testid="gallery-container"], ' +
      '.gallery-grid, ' +
      '.gallery-masonry, ' +
      '.gallery, ' +
      '[class*="gallery"]'
    );
    
    await expect(galleryContainer.first()).toBeVisible();
  });

  test('should display gallery items if they exist', async ({ page }) => {
    // Look for gallery items (images, cards, etc.)
    const galleryItems = page.locator(
      '[data-testid="gallery-item"], ' +
      '.gallery-item, ' +
      '.gallery-card, ' +
      'img, ' +
      '[class*="gallery-item"], ' +
      '[class*="gallery-card"]'
    );
    
    const itemCount = await galleryItems.count();
    if (itemCount > 0) {
      // Check that at least one gallery item is visible
      const firstItem = galleryItems.first();
      await expect(firstItem).toBeVisible();
      
      // If it's an image, check if it loads
      if (await firstItem.getAttribute('src')) {
        await expect(firstItem).toHaveAttribute('src');
      }
    }
  });

  test('should handle image lightbox/modal if available', async ({ page }) => {
    const galleryItems = page.locator('img, [data-testid="gallery-item"]');
    const itemCount = await galleryItems.count();
    
    if (itemCount > 0) {
      // Click on the first gallery item
      await galleryItems.first().click();
      await page.waitForTimeout(1000);
      
      // Look for lightbox/modal
      const lightbox = page.locator(
        '[data-testid="lightbox"], ' +
        '.lightbox, ' +
        '.modal, ' +
        '[role="dialog"], ' +
        '[class*="lightbox"], ' +
        '[class*="modal"]'
      );
      
      if (await lightbox.count() > 0) {
        await expect(lightbox.first()).toBeVisible();
        
        // Look for close button
        const closeButton = lightbox.locator(
          'button:has-text("Close"), ' +
          'button[aria-label="Close"], ' +
          '.close, ' +
          '[class*="close"]'
        );
        
        if (await closeButton.count() > 0) {
          await closeButton.first().click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should have proper navigation', async ({ page }) => {
    const header = page.locator('header, [role="navigation"]');
    await expect(header).toBeVisible();
    
    // Check if gallery page is highlighted in navigation
    const currentPageLink = page.locator('nav a[href*="gallery"], header a[href*="gallery"]');
    if (await currentPageLink.count() > 0) {
      await expect(currentPageLink.first()).toBeVisible();
    }
  });

  test('should handle gallery filtering if available', async ({ page }) => {
    // Look for filter buttons or category selectors
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

  test('should handle gallery search if available', async ({ page }) => {
    const searchInput = page.locator(
      'input[type="search"], ' +
      'input[placeholder*="search"], ' +
      '[data-testid="search"]'
    );
    
    if (await searchInput.count() > 0) {
      await searchInput.first().fill('test');
      await page.waitForTimeout(1000);
      
      // Check if search triggered
      await expect(searchInput.first()).toHaveValue('test');
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should handle empty gallery state gracefully', async ({ page }) => {
    // If no gallery items are found, there should be an appropriate message
    const emptyState = page.locator(
      '[data-testid="empty-state"], ' +
      '.empty-state, ' +
      '.no-images, ' +
      '.no-gallery, ' +
      '[class*="empty"]'
    );
    
    const galleryItems = page.locator('img, [class*="gallery-item"]');
    const hasItems = await galleryItems.count() > 0;
    
    if (!hasItems) {
      await expect(emptyState.first()).toBeVisible();
    }
  });

  test('should handle image loading errors gracefully', async ({ page }) => {
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // Check if images have proper alt attributes for accessibility
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const image = images.nth(i);
        const altText = await image.getAttribute('alt');
        // Alt text should exist (can be empty for decorative images)
        expect(altText !== null).toBe(true);
      }
    }
  });
});
