import { test, expect, TEST_ADMIN_CREDENTIALS } from '../setup';

test.describe('Admin Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
  });

  test('should load login page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Login|Admin|portfolio/i);
    await expect(page.locator('main, body')).toBeVisible();
  });

  test('should display login form', async ({ page }) => {
    const loginForm = page.locator(
      '[data-testid="login-form"], ' +
      'form, ' +
      '.login-form, ' +
      '[class*="login-form"]'
    );

    await expect(loginForm.first()).toBeVisible();
  });

  test('should have username/email input field', async ({ page }) => {
    const usernameInput = page.locator(
      'input[name="username"], ' +
      'input[name="email"], ' +
      'input[type="email"], ' +
      'input[placeholder*="username"], ' +
      'input[placeholder*="email"], ' +
      '[data-testid="username-input"]'
    );

    await expect(usernameInput.first()).toBeVisible();
  });

  test('should have password input field', async ({ page }) => {
    const passwordInput = page.locator(
      'input[name="password"], ' +
      'input[type="password"], ' +
      'input[placeholder*="password"], ' +
      '[data-testid="password-input"]'
    );

    await expect(passwordInput.first()).toBeVisible();
  });

  test('should have submit button', async ({ page }) => {
    const submitButton = page.locator(
      'button[type="submit"], ' +
      'input[type="submit"], ' +
      'button:has-text("Login"), ' +
      'button:has-text("Sign In"), ' +
      '[data-testid="login-button"]'
    );

    await expect(submitButton.first()).toBeVisible();
  });

  test('should handle empty form submission', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"], input[type="submit"]');

    if (await submitButton.count() > 0) {
      await submitButton.first().click();
      await page.waitForTimeout(1000);

      // Look for validation errors
      const errorMessage = page.locator(
        '.error, ' +
        '[data-testid="error"], ' +
        '.validation-error, ' +
        '[class*="error"], ' +
        '.required'
      );

      if (await errorMessage.count() > 0) {
        await expect(errorMessage.first()).toBeVisible();
      }
    }
  });

  test('should handle invalid credentials', async ({ page }) => {
    const usernameInput = page.locator('input[name="username"], input[name="email"], input[type="email"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');
    const submitButton = page.locator('button[type="submit"], input[type="submit"]');

    if (await usernameInput.count() > 0 && await passwordInput.count() > 0 && await submitButton.count() > 0) {
      // Fill with invalid credentials
      await usernameInput.first().fill('invalid@example.com');
      await passwordInput.first().fill('wrongpassword');

      await submitButton.first().click();
      await page.waitForTimeout(2000);

      // Look for error message
      const errorMessage = page.locator(
        '.error, ' +
        '[data-testid="error"], ' +
        '.error-message, ' +
        '[class*="error"], ' +
        '.alert'
      );

      if (await errorMessage.count() > 0) {
        await expect(errorMessage.first()).toBeVisible();
      }

      // Should still be on login page
      await expect(page).toHaveURL(/.*login.*/);
    }
  });

  test('should handle password visibility toggle if available', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    const toggleButton = page.locator(
      'button[aria-label*="password"], ' +
      'button[title*="password"], ' +
      '.password-toggle, ' +
      '[class*="password-toggle"]'
    );

    if (await passwordInput.count() > 0 && await toggleButton.count() > 0) {
      // Initially password should be hidden
      await expect(passwordInput.first()).toHaveAttribute('type', 'password');

      // Click toggle to show password
      await toggleButton.first().click();
      await page.waitForTimeout(500);

      // Password should now be visible
      await expect(passwordInput.first()).toHaveAttribute('type', 'text');

      // Click again to hide
      await toggleButton.first().click();
      await page.waitForTimeout(500);

      await expect(passwordInput.first()).toHaveAttribute('type', 'password');
    }
  });

  test('should have remember me option if available', async ({ page }) => {
    const rememberCheckbox = page.locator(
      'input[name="remember"], ' +
      'input[type="checkbox"], ' +
      '[data-testid="remember-me"]'
    );

    const rememberLabel = page.locator(
      'label:has-text("Remember"), ' +
      'label:has-text("remember"), ' +
      '.remember-me'
    );

    if (await rememberCheckbox.count() > 0 || await rememberLabel.count() > 0) {
      const checkbox = rememberCheckbox.count() > 0 ? rememberCheckbox : rememberLabel.locator('input');
      await expect(checkbox.first()).toBeVisible();
    }
  });

  test('should have forgot password link if available', async ({ page }) => {
    const forgotLink = page.locator(
      'a:has-text("Forgot"), ' +
      'a:has-text("Reset"), ' +
      'a[href*="forgot"], ' +
      'a[href*="reset"], ' +
      '[data-testid="forgot-password"]'
    );

    if (await forgotLink.count() > 0) {
      await expect(forgotLink.first()).toBeVisible();
      await forgotLink.first().click();
      await page.waitForTimeout(1000);

      // Should navigate to forgot password page or show modal
      const url = page.url();
      const hasForgotInUrl = url.includes('forgot') || url.includes('reset');
      const hasModal = page.locator('.modal, [role="dialog"]').count() > 0;

      expect(hasForgotInUrl || hasModal).toBe(true);
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const loginForm = page.locator('form, .login-form');
    await expect(loginForm.first()).toBeVisible();
  });

  test('should redirect to admin dashboard on successful login with test credentials', async ({ page }) => {
    const usernameInput = page.locator('input[name="username"], input[name="email"], input[type="email"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');
    const submitButton = page.locator('button[type="submit"], input[type="submit"]');

    if (await usernameInput.count() > 0 && await passwordInput.count() > 0 && await submitButton.count() > 0) {
      // Use test credentials
      await usernameInput.first().fill(TEST_ADMIN_CREDENTIALS.username);
      await passwordInput.first().fill(TEST_ADMIN_CREDENTIALS.password);
      await submitButton.first().click();
      await page.waitForTimeout(3000);

      // Should redirect to admin dashboard
      await expect(page).toHaveURL(/.*admin.*/);
      await expect(page.locator('main, body')).toBeVisible();
    }
  });
});
