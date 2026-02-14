import { test, expect } from '../setup';

test.describe('Projects Page', () => {
  test.beforeEach(async ({ page, waitForPageLoad }) => {
    await page.goto('/projects');
    await waitForPageLoad();
  });

  test('should load projects page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Projects|portfolio|aiyu/i);
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display projects grid or list', async ({ page }) => {
    // Look for projects container
    const projectsContainer = page.locator(
      '[data-testid="projects-container"], ' +
      '.projects-grid, ' +
      '.projects-list, ' +
      '[class*="project"]'
    );
    
    await expect(projectsContainer.first()).toBeVisible();
  });

  test('should display project cards if projects exist', async ({ page }) => {
    // Look for project cards
    const projectCards = page.locator(
      '[data-testid="project-card"], ' +
      '.project-card, ' +
      '.project-item, ' +
      '[class*="project-card"], ' +
      '[class*="project-item"]'
    );
    
    const cardCount = await projectCards.count();
    if (cardCount > 0) {
      // Check that at least one project card has content
      const firstCard = projectCards.first();
      await expect(firstCard).toBeVisible();
      
      // Check for common project card elements
      const title = firstCard.locator('h1, h2, h3, .title, [class*="title"]');
      if (await title.count() > 0) {
        const titleText = await title.first().textContent();
        expect(titleText?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('should have proper navigation', async ({ page }) => {
    const header = page.locator('header, [role="navigation"]');
    await expect(header).toBeVisible();
    
    // Check if projects page is highlighted in navigation
    const currentPageLink = page.locator('nav a[href*="project"], header a[href*="project"]');
    if (await currentPageLink.count() > 0) {
      await expect(currentPageLink.first()).toBeVisible();
    }
  });

  test('should handle project filtering if available', async ({ page }) => {
    // Look for filter buttons or dropdowns
    const filterButtons = page.locator(
      '[data-testid="filter"], ' +
      '.filter, ' +
      '[class*="filter"], ' +
      'button[aria-label*="filter"]'
    );
    
    if (await filterButtons.count() > 0) {
      await filterButtons.first().click();
      await page.waitForTimeout(500);
      
      // Verify filter is working (content changes or filter is applied)
      const activeFilter = page.locator('.active, [aria-pressed="true"], .selected');
      if (await activeFilter.count() > 0) {
        await expect(activeFilter.first()).toBeVisible();
      }
    }
  });

  test('should have working search if available', async ({ page }) => {
    const searchInput = page.locator(
      'input[type="search"], ' +
      'input[placeholder*="search"], ' +
      '[data-testid="search"]'
    );
    
    if (await searchInput.count() > 0) {
      await searchInput.first().fill('test');
      await page.waitForTimeout(1000);
      
      // Check if search triggered (could be content update or loading state)
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

  test('should handle empty projects state gracefully', async ({ page }) => {
    // If no projects are found, there should be an appropriate message
    const emptyState = page.locator(
      '[data-testid="empty-state"], ' +
      '.empty-state, ' +
      '.no-projects, ' +
      '[class*="empty"]'
    );
    
    const projectCards = page.locator('[class*="project"]');
    const hasProjects = await projectCards.count() > 0;
    
    if (!hasProjects) {
      await expect(emptyState.first()).toBeVisible();
    }
  });
});
