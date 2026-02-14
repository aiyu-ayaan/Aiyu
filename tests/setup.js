import { test as base, expect } from '@playwright/test';

// Test admin credentials (hardcoded for testing purposes)
const TEST_ADMIN_CREDENTIALS = {
  username: 'test_admin',
  password: 'test_password_123'
};

// Extend base test with custom fixtures
export const test = base.extend({
  // authenticated page fixture for admin tests
  authenticatedPage: async ({ page, context }, use) => {
    // Navigate to login page first
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    // Fill in login credentials
    const usernameInput = page.locator('input[name="username"], input[name="email"], input[type="email"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');
    const submitButton = page.locator('button[type="submit"], input[type="submit"]');

    if (await usernameInput.count() > 0 && await passwordInput.count() > 0 && await submitButton.count() > 0) {
      await usernameInput.first().fill(TEST_ADMIN_CREDENTIALS.username);
      await passwordInput.first().fill(TEST_ADMIN_CREDENTIALS.password);
      await submitButton.first().click();

      // Wait for login to complete and redirect to admin dashboard
      await page.waitForURL(/.*admin.*/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    }

    await use(page);
  },

  // Helper to wait for page to be fully loaded
  waitForPageLoad: async ({ page }, use) => {
    const waitFunction = async () => {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Additional wait for dynamic content
    };
    await use(waitFunction);
  },

  // Test credentials fixture
  testCredentials: async ({ }, use) => {
    await use(TEST_ADMIN_CREDENTIALS);
  }
});

export { expect, TEST_ADMIN_CREDENTIALS };
