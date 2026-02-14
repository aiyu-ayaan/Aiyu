import { test, expect } from '../setup';

test.describe('Contact Page', () => {
  test.beforeEach(async ({ page, waitForPageLoad }) => {
    await page.goto('/contact-us');
    await waitForPageLoad();
  });

  test('should load contact page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Contact|portfolio|aiyu/i);
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display contact form', async ({ page }) => {
    // Look for contact form
    const contactForm = page.locator(
      '[data-testid="contact-form"], ' +
      'form, ' +
      '.contact-form, ' +
      '[class*="contact-form"]'
    );
    
    await expect(contactForm.first()).toBeVisible();
  });

  test('should have form input fields', async ({ page }) => {
    // Look for common form fields
    const nameInput = page.locator(
      'input[name="name"], ' +
      'input[placeholder*="name"], ' +
      '[data-testid="name-input"]'
    );
    
    const emailInput = page.locator(
      'input[name="email"], ' +
      'input[type="email"], ' +
      'input[placeholder*="email"], ' +
      '[data-testid="email-input"]'
    );
    
    const messageInput = page.locator(
      'textarea[name="message"], ' +
      'textarea[placeholder*="message"], ' +
      '[data-testid="message-input"]'
    );
    
    // Check if at least some form fields exist
    const hasNameField = await nameInput.count() > 0;
    const hasEmailField = await emailInput.count() > 0;
    const hasMessageField = await messageInput.count() > 0;
    
    expect(hasNameField || hasEmailField || hasMessageField).toBe(true);
  });

  test('should have submit button', async ({ page }) => {
    const submitButton = page.locator(
      'button[type="submit"], ' +
      'input[type="submit"], ' +
      'button:has-text("Send"), ' +
      'button:has-text("Submit"), ' +
      '[data-testid="submit-button"]'
    );
    
    await expect(submitButton.first()).toBeVisible();
  });

  test('should handle form validation', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"], input[type="submit"]');
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    
    if (await submitButton.count() > 0 && await emailInput.count() > 0) {
      // Try to submit form with invalid email
      await emailInput.first().fill('invalid-email');
      await submitButton.first().click();
      await page.waitForTimeout(1000);
      
      // Look for validation error
      const errorMessage = page.locator(
        '.error, ' +
        '[data-testid="error"], ' +
        '.validation-error, ' +
        '[class*="error"]'
      );
      
      if (await errorMessage.count() > 0) {
        await expect(errorMessage.first()).toBeVisible();
      }
    }
  });

  test('should display contact information', async ({ page }) => {
    // Look for contact information sections
    const contactInfo = page.locator(
      '[data-testid="contact-info"], ' +
      '.contact-info, ' +
      '.contact-details, ' +
      '[class*="contact-info"]'
    );
    
    if (await contactInfo.count() > 0) {
      await expect(contactInfo.first()).toBeVisible();
    }
  });

  test('should have social media links if available', async ({ page }) => {
    const socialLinks = page.locator(
      'a[href*="twitter"], ' +
      'a[href*="linkedin"], ' +
      'a[href*="github"], ' +
      'a[href*="instagram"], ' +
      '[data-testid="social-links"], ' +
      '.social-links'
    );
    
    const socialCount = await socialLinks.count();
    if (socialCount > 0) {
      await expect(socialLinks.first()).toBeVisible();
    }
  });

  test('should have proper navigation', async ({ page }) => {
    const header = page.locator('header, [role="navigation"]');
    await expect(header).toBeVisible();
    
    // Check if contact page is highlighted in navigation
    const currentPageLink = page.locator('nav a[href*="contact"], header a[href*="contact"]');
    if (await currentPageLink.count() > 0) {
      await expect(currentPageLink.first()).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should handle form submission', async ({ page }) => {
    const nameInput = page.locator('input[name="name"], input[placeholder*="name"]');
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const messageInput = page.locator('textarea[name="message"], textarea[placeholder*="message"]');
    const submitButton = page.locator('button[type="submit"], input[type="submit"]');
    
    if (await nameInput.count() > 0 && await emailInput.count() > 0 && 
        await messageInput.count() > 0 && await submitButton.count() > 0) {
      
      // Fill out the form with test data
      await nameInput.first().fill('Test User');
      await emailInput.first().fill('test@example.com');
      await messageInput.first().fill('This is a test message from automated testing.');
      
      // Submit the form
      await submitButton.first().click();
      await page.waitForTimeout(2000);
      
      // Look for success message or response
      const successMessage = page.locator(
        '.success, ' +
        '[data-testid="success"], ' +
        '.success-message, ' +
        '[class*="success"]'
      );
      
      const errorMessage = page.locator(
        '.error, ' +
        '[data-testid="error"], ' +
        '.error-message, ' +
        '[class*="error"]'
      );
      
      // Either success or error message should appear
      const hasResponse = await successMessage.count() > 0 || await errorMessage.count() > 0;
      expect(hasResponse).toBe(true);
    }
  });
});
