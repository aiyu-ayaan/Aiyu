import { test, expect } from '../setup';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for visual tests
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.describe('Public Pages - Desktop', () => {
    test('home page visual snapshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // Wait for animations
      
      await expect(page).toHaveScreenshot('home-desktop.png');
    });

    test('about page visual snapshot', async ({ page }) => {
      await page.goto('/about-me');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('about-desktop.png');
    });

    test('projects page visual snapshot', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('projects-desktop.png');
    });

    test('blogs page visual snapshot', async ({ page }) => {
      await page.goto('/blogs');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('blogs-desktop.png');
    });

    test('gallery page visual snapshot', async ({ page }) => {
      await page.goto('/gallery');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('gallery-desktop.png');
    });

    test('contact page visual snapshot', async ({ page }) => {
      await page.goto('/contact-us');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('contact-desktop.png');
    });
  });

  test.describe('Public Pages - Mobile', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('home page mobile visual snapshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      await expect(page).toHaveScreenshot('home-mobile.png');
    });

    test('about page mobile visual snapshot', async ({ page }) => {
      await page.goto('/about-me');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('about-mobile.png');
    });

    test('projects page mobile visual snapshot', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('projects-mobile.png');
    });

    test('contact page mobile visual snapshot', async ({ page }) => {
      await page.goto('/contact-us');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('contact-mobile.png');
    });
  });

  test.describe('Component Snapshots', () => {
    test('header component visual snapshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const header = page.locator('header');
      await expect(header).toBeVisible();
      
      await expect(header).toHaveScreenshot('header-component.png');
    });

    test('footer component visual snapshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
      
      await expect(footer).toHaveScreenshot('footer-component.png');
    });

    test('navigation menu visual snapshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const nav = page.locator('nav, [role="navigation"]');
      await expect(nav).toBeVisible();
      
      await expect(nav).toHaveScreenshot('navigation-component.png');
    });
  });

  test.describe('Interactive Elements', () => {
    test('hover states on navigation links', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const navLinks = page.locator('nav a, header a');
      const linkCount = await navLinks.count();
      
      if (linkCount > 0) {
        const firstLink = navLinks.first();
        await firstLink.hover();
        await page.waitForTimeout(500);
        
        await expect(page.locator('header')).toHaveScreenshot('nav-hover-state.png');
      }
    });

    test('button hover states', async ({ page }) => {
      await page.goto('/contact-us');
      await page.waitForLoadState('networkidle');
      
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      if (buttonCount > 0) {
        const firstButton = buttons.first();
        await firstButton.hover();
        await page.waitForTimeout(500);
        
        await expect(firstButton).toHaveScreenshot('button-hover-state.png');
      }
    });

    test('form focus states', async ({ page }) => {
      await page.goto('/contact-us');
      await page.waitForLoadState('networkidle');
      
      const inputs = page.locator('input, textarea');
      const inputCount = await inputs.count();
      
      if (inputCount > 0) {
        const firstInput = inputs.first();
        await firstInput.focus();
        await page.waitForTimeout(500);
        
        await expect(firstInput).toHaveScreenshot('input-focus-state.png');
      }
    });
  });

  test.describe('Responsive Design Tests', () => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-hd' },
      { width: 1366, height: 768, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    viewports.forEach(({ width, height, name }) => {
      test(`responsive layout - ${name}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        await expect(page).toHaveScreenshot(`responsive-${name}.png`);
      });
    });
  });

  test.describe('Dark/Light Theme Tests', () => {
    test('light theme snapshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Ensure light theme
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      });
      
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot('light-theme.png');
    });

    test('dark theme snapshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot('dark-theme.png');
    });
  });

  test.describe('Admin Pages - Visual Tests', () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // Authenticated state

    test('admin dashboard visual snapshot', async ({ page, authenticatedPage }) => {
      await authenticatedPage.goto('/admin');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('admin-dashboard.png');
    });

    test('admin projects page visual snapshot', async ({ page, authenticatedPage }) => {
      await authenticatedPage.goto('/admin/projects');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('admin-projects.png');
    });

    test('admin blogs page visual snapshot', async ({ page, authenticatedPage }) => {
      await authenticatedPage.goto('/admin/blogs');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('admin-blogs.png');
    });
  });

  test.describe('Error and Edge Cases', () => {
    test('404 page visual snapshot', async ({ page }) => {
      await page.goto('/non-existent-page');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('404-page.png');
    });

    test('loading states visual snapshot', async ({ page }) => {
      // Navigate to a page that might have loading states
      await page.goto('/projects');
      
      // Take screenshot immediately to catch loading states
      await expect(page).toHaveScreenshot('loading-state.png', { timeout: 1000 });
    });
  });
});
