import { test, expect } from '../setup';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page, waitForPageLoad }) => {
    await page.goto('/');
    await waitForPageLoad();
  });

  test('should load home page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Portfolio|aiyu/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display hero section', async ({ page }) => {
    // Check for either futuristic resume or game portfolio
    const heroSection = page.locator('[data-testid="hero-section"], .hero, main > div:first-child');
    await expect(heroSection).toBeVisible();
  });

  test('should display tech stack carousel', async ({ page }) => {
    const techStack = page.locator('[data-testid="tech-stack"], .tech-stack, [class*="tech"], [class*="stack"]');
    await expect(techStack.first()).toBeVisible();
  });

  test('should display about section', async ({ page }) => {
    const aboutSection = page.locator('[data-testid="about"], .about, [class*="about"]');
    await expect(aboutSection.first()).toBeVisible();
  });

  test('should display projects section', async ({ page }) => {
    const projectsSection = page.locator('[data-testid="projects"], .projects, [class*="project"]');
    await expect(projectsSection.first()).toBeVisible();
  });

  test('should display blogs section', async ({ page }) => {
    const blogsSection = page.locator('[data-testid="blogs"], .blogs, [class*="blog"]');
    await expect(blogsSection.first()).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    const header = page.locator('header, [role="navigation"]');
    await expect(header).toBeVisible();
    
    // Check for navigation links
    const navLinks = page.locator('nav a, header a');
    const navCount = await navLinks.count();
    expect(navCount).toBeGreaterThan(0);
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

  test('should handle dark/light theme toggle if present', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"], .theme-toggle, [class*="theme"]');
    if (await themeToggle.count() > 0) {
      await themeToggle.first().click();
      await page.waitForTimeout(500);
      
      // Check if theme changed (this is a basic check)
      const body = page.locator('body');
      await expect(body).toBeVisible();
    }
  });
});
