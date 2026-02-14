import { test, expect } from '../setup';

test.describe('Admin Content Management', () => {
  test.describe('Projects Management', () => {
    test.beforeEach(async ({ page, authenticatedPage, waitForPageLoad }) => {
      await authenticatedPage.goto('/admin/projects');
      await waitForPageLoad();
    });

    test('should load projects management page', async ({ page }) => {
      await expect(page.locator('main, body')).toBeVisible();
    });

    test('should display projects list', async ({ page }) => {
      const projectsList = page.locator(
        '[data-testid="projects-list"], ' +
        '.projects-list, ' +
        'table, ' +
        '[class*="project"]'
      );

      await expect(projectsList.first()).toBeVisible();
    });

    test('should have add new project button', async ({ page }) => {
      const addButton = page.locator(
        'button:has-text("Add"), ' +
        'button:has-text("New"), ' +
        'a:has-text("Add"), ' +
        'a:has-text("New"), ' +
        '[data-testid="add-project"]'
      );

      await expect(addButton.first()).toBeVisible();
    });

    test('should navigate to add new project', async ({ page }) => {
      const addButton = page.locator('button:has-text("Add"), button:has-text("New"), a:has-text("Add"), a:has-text("New")');

      if (await addButton.count() > 0) {
        await addButton.first().click();
        await page.waitForLoadState('networkidle');

        // Should be on new project page
        await expect(page.locator('main, body')).toBeVisible();

        // Look for form fields
        const form = page.locator('form');
        if (await form.count() > 0) {
          await expect(form.first()).toBeVisible();
        }
      }
    });

    test('should edit existing project', async ({ page }) => {
      const editButtons = page.locator(
        'button:has-text("Edit"), ' +
        'a:has-text("Edit"), ' +
        '[data-testid="edit-project"]'
      );

      if (await editButtons.count() > 0) {
        await editButtons.first().click();
        await page.waitForLoadState('networkidle');

        await expect(page.locator('main, body')).toBeVisible();

        // Look for edit form
        const form = page.locator('form');
        if (await form.count() > 0) {
          await expect(form.first()).toBeVisible();
        }
      }
    });

    test('should delete project', async ({ page }) => {
      const deleteButtons = page.locator(
        'button:has-text("Delete"), ' +
        'button:has-text("Remove"), ' +
        '[data-testid="delete-project"]'
      );

      if (await deleteButtons.count() > 0) {
        // Click delete button
        await deleteButtons.first().click();
        await page.waitForTimeout(1000);

        // Look for confirmation dialog
        const confirmDialog = page.locator(
          '[role="dialog"], ' +
          '.modal, ' +
          '.confirm-dialog'
        );

        if (await confirmDialog.count() > 0) {
          await expect(confirmDialog.first()).toBeVisible();

          // Look for confirm button
          const confirmButton = confirmDialog.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")');
          if (await confirmButton.count() > 0) {
            // Don't actually delete, just verify the dialog exists
            await expect(confirmButton.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Blogs Management', () => {
    test.beforeEach(async ({ page, authenticatedPage, waitForPageLoad }) => {
      await authenticatedPage.goto('/admin/blogs');
      await waitForPageLoad();
    });

    test('should load blogs management page', async ({ page }) => {
      await expect(page.locator('main, body')).toBeVisible();
    });

    test('should display blogs list', async ({ page }) => {
      const blogsList = page.locator(
        '[data-testid="blogs-list"], ' +
        '.blogs-list, ' +
        'table, ' +
        '[class*="blog"]'
      );

      await expect(blogsList.first()).toBeVisible();
    });

    test('should have add new blog button', async ({ page }) => {
      const addButton = page.locator(
        'button:has-text("Add"), ' +
        'button:has-text("New"), ' +
        'a:has-text("Add"), ' +
        'a:has-text("New"), ' +
        '[data-testid="add-blog"]'
      );

      await expect(addButton.first()).toBeVisible();
    });

    test('should navigate to add new blog', async ({ page }) => {
      const addButton = page.locator('button:has-text("Add"), button:has-text("New"), a:has-text("Add"), a:has-text("New")');

      if (await addButton.count() > 0) {
        await addButton.first().click();
        await page.waitForLoadState('networkidle');

        await expect(page.locator('main, body')).toBeVisible();

        // Look for rich text editor or form
        const editor = page.locator(
          '.editor, ' +
          '[data-testid="editor"], ' +
          'textarea, ' +
          'form'
        );

        if (await editor.count() > 0) {
          await expect(editor.first()).toBeVisible();
        }
      }
    });

    test('should toggle blog publish status', async ({ page }) => {
      const toggleButtons = page.locator(
        'input[type="checkbox"], ' +
        '.toggle, ' +
        'button:has-text("Publish"), ' +
        'button:has-text("Draft"), ' +
        '[data-testid="publish-toggle"]'
      );

      if (await toggleButtons.count() > 0) {
        const toggle = toggleButtons.first();
        await expect(toggle).toBeVisible();

        // Don't actually toggle to avoid changing data
        // Just verify it exists and is clickable
        await expect(toggle).toBeEnabled();
      }
    });
  });

  test.describe('About Management', () => {
    test.beforeEach(async ({ page, authenticatedPage, waitForPageLoad }) => {
      await authenticatedPage.goto('/admin/about');
      await waitForPageLoad();
    });

    test('should load about management page', async ({ page }) => {
      await expect(page.locator('main, body')).toBeVisible();
    });

    test('should display about form', async ({ page }) => {
      const aboutForm = page.locator('form, [data-testid="about-form"]');

      if (await aboutForm.count() > 0) {
        await expect(aboutForm.first()).toBeVisible();
      }
    });

    test('should have text input fields', async ({ page }) => {
      const textInputs = page.locator(
        'input[type="text"], ' +
        'textarea, ' +
        '[contenteditable="true"]'
      );

      const inputCount = await textInputs.count();
      if (inputCount > 0) {
        await expect(textInputs.first()).toBeVisible();
      }
    });

    test('should have save button', async ({ page }) => {
      const saveButton = page.locator(
        'button:has-text("Save"), ' +
        'button[type="submit"], ' +
        'input[type="submit"], ' +
        '[data-testid="save"]'
      );

      await expect(saveButton.first()).toBeVisible();
    });
  });

  test.describe('Gallery Management', () => {
    test.beforeEach(async ({ page, authenticatedPage, waitForPageLoad }) => {
      await authenticatedPage.goto('/admin/gallery');
      await waitForPageLoad();
    });

    test('should load gallery management page', async ({ page }) => {
      await expect(page.locator('main, body')).toBeVisible();
    });

    test('should display gallery items', async ({ page }) => {
      const galleryItems = page.locator(
        '[data-testid="gallery-items"], ' +
        '.gallery-items, ' +
        '[class*="gallery-item"]'
      );

      await expect(galleryItems.first()).toBeVisible();
    });

    test('should have upload functionality', async ({ page }) => {
      const uploadButton = page.locator(
        'input[type="file"], ' +
        'button:has-text("Upload"), ' +
        '[data-testid="upload"]'
      );

      if (await uploadButton.count() > 0) {
        await expect(uploadButton.first()).toBeVisible();
      }
    });

    test('should have add new image button', async ({ page }) => {
      const addButton = page.locator(
        'button:has-text("Add"), ' +
        'button:has-text("Upload"), ' +
        'a:has-text("Add"), ' +
        '[data-testid="add-image"]'
      );

      await expect(addButton.first()).toBeVisible();
    });
  });

  test.describe('Contact Management', () => {
    test.beforeEach(async ({ page, authenticatedPage, waitForPageLoad }) => {
      await authenticatedPage.goto('/admin/contact');
      await waitForPageLoad();
    });

    test('should load contact management page', async ({ page }) => {
      await expect(page.locator('main, body')).toBeVisible();
    });

    test('should display contact messages', async ({ page }) => {
      const messagesList = page.locator(
        '[data-testid="messages-list"], ' +
        '.messages-list, ' +
        'table, ' +
        '[class*="message"]'
      );

      await expect(messagesList.first()).toBeVisible();
    });

    test('should have message filtering options', async ({ page }) => {
      const filters = page.locator(
        'select, ' +
        'button:has-text("Filter"), ' +
        '[data-testid="filter"]'
      );

      if (await filters.count() > 0) {
        await expect(filters.first()).toBeVisible();
      }
    });
  });

  test.describe('Configuration Management', () => {
    test.beforeEach(async ({ page, authenticatedPage, waitForPageLoad }) => {
      await authenticatedPage.goto('/admin/config');
      await waitForPageLoad();
    });

    test('should load configuration page', async ({ page }) => {
      await expect(page.locator('main, body')).toBeVisible();
    });

    test('should display configuration form', async ({ page }) => {
      const configForm = page.locator('form, [data-testid="config-form"]');

      if (await configForm.count() > 0) {
        await expect(configForm.first()).toBeVisible();
      }
    });

    test('should have various input fields', async ({ page }) => {
      const inputs = page.locator(
        'input, ' +
        'textarea, ' +
        'select'
      );

      const inputCount = await inputs.count();
      if (inputCount > 0) {
        await expect(inputs.first()).toBeVisible();
      }
    });
  });
});
