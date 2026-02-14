# UI Automation Tests

This directory contains comprehensive UI automation tests for the portfolio website using Playwright.

## Test Structure

```
tests/
├── setup.js                 # Test configuration and custom fixtures
├── public/                  # Public site tests
│   ├── home.spec.js         # Home page tests
│   ├── about.spec.js        # About page tests
│   ├── projects.spec.js     # Projects page tests
│   ├── blogs.spec.js        # Blogs page tests
│   ├── gallery.spec.js      # Gallery page tests
│   └── contact.spec.js      # Contact page tests
├── admin/                   # Admin panel tests
│   ├── login.spec.js        # Admin login tests
│   ├── dashboard.spec.js    # Admin dashboard tests
│   └── content-management.spec.js # Content management tests
└── visual/                  # Visual regression tests
    └── visual-regression.spec.js   # Visual snapshot tests
```

## Running Tests

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

3. **Important**: Create a test admin user in your database with these credentials:
   - **Username**: `test_admin`
   - **Password**: `test_password_123`

   This user is hardcoded in the test setup and will be used automatically for admin tests.

### Available Test Scripts

```bash
npm test              # Run all tests
npm run test:ui       # Run tests with UI mode
npm run test:headed   # Run tests with visible browser
npm run test:debug    # Run tests in debug mode
npm run test:visual   # Run only visual regression tests
npm run test:public   # Run only public site tests
npm run test:admin    # Run only admin panel tests
npm run test:report   # Show test report
npm run test:update-snapshots # Update visual snapshots
```

### Running Specific Tests

```bash
# Run a specific test file
npx playwright test tests/public/home.spec.js

# Run tests with specific pattern
npx playwright test --grep "should load"

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Categories

### 1. Public Site Tests (`tests/public/`)

These tests verify the functionality of the public-facing website:

- **Home Page**: Hero sections, navigation, content loading
- **About Page**: Personal information display
- **Projects Page**: Project listings, filtering, navigation
- **Blogs Page**: Blog listings, pagination, individual blog pages
- **Gallery Page**: Image display, lightbox functionality
- **Contact Page**: Form validation, submission, contact information

### 2. Admin Panel Tests (`tests/admin/`)

These tests verify the admin functionality:

- **Login**: Authentication, form validation, error handling
- **Dashboard**: Navigation, stats display, quick actions
- **Content Management**: CRUD operations for projects, blogs, gallery, etc.

### 3. Visual Regression Tests (`tests/visual/`)

These tests capture screenshots and compare them against baseline images:

- Page snapshots across different viewports
- Component snapshots
- Interactive element states (hover, focus)
- Theme variations (light/dark)
- Responsive design verification

## Configuration

### Environment Variables

- `NEXT_PUBLIC_BASE_URL`: Base URL for the application (default: http://localhost:3000)
- `ADMIN_AUTH_TOKEN`: Authentication token for admin tests

### Playwright Configuration

Main configuration is in `playwright.config.js`:
- Multiple browser support (Chromium, Firefox, WebKit)
- Mobile viewport testing
- Automatic server startup
- Screenshot/video capture on failure
- HTML reports

Mobile-specific configuration is in `playwright.mobile.config.js`.

## Best Practices

### Writing Tests

1. **Use descriptive test names**: Tests should clearly describe what they're verifying
2. **Use data-testid attributes**: Add test IDs to elements for reliable selection
3. **Wait for elements**: Use proper waiting strategies instead of fixed timeouts
4. **Test user flows**: Test complete user journeys, not just individual elements
5. **Keep tests independent**: Each test should be able to run independently

### Test Organization

- Group related tests using `test.describe()`
- Use `test.beforeEach()` for common setup
- Use fixtures for shared functionality
- Separate visual tests from functional tests

### Debugging

1. Use `npm run test:debug` to step through tests
2. Use `npm run test:headed` to see the browser
3. Check HTML reports for detailed results
4. Use Playwright Inspector for debugging

## CI/CD Integration

Tests are automatically run on:
- Push to main/develop branches
- Pull requests to main branch
- Daily schedule (2 AM UTC)

### GitHub Actions Workflow

The `.github/workflows/ui-tests.yml` file includes:

- Multi-browser testing
- Visual regression testing
- Accessibility testing (using axe-core)
- Performance testing (using Lighthouse CI)
- Artifact upload for test results

### Environment Setup for CI

Set these secrets in your GitHub repository:
- `ADMIN_AUTH_TOKEN`: Valid admin authentication token
- `LHCI_GITHUB_APP_TOKEN`: Lighthouse CI GitHub app token

## Visual Regression Testing

### Updating Snapshots

When you intentionally change the UI, update snapshots:

```bash
npm run test:update-snapshots
```

### Best Practices for Visual Tests

1. **Stable content**: Avoid testing dynamic content that changes frequently
2. **Consistent viewports**: Use fixed viewport sizes for consistency
3. **Wait for animations**: Allow time for animations to complete
4. **Exclude dynamic elements**: Use masks or selectors to exclude timestamps, etc.

## Accessibility Testing

Accessibility tests use axe-core to verify WCAG compliance:

```bash
# Install axe CLI
npm install -g @axe-core/cli

# Run accessibility tests
axe http://localhost:3000 --tags wcag2a,wcag2aa --exit
```

## Performance Testing

Performance tests use Lighthouse CI to measure:

- Performance score
- Accessibility score
- Best practices
- SEO

Configuration is in `lighthouserc.js`.

## Troubleshooting

### Common Issues

1. **Tests fail intermittently**: Increase wait times or use more reliable selectors
2. **Visual tests fail**: Update snapshots or check for timing issues
3. **Admin tests fail**: Verify authentication setup and environment variables
4. **Browser not found**: Run `npx playwright install` to install browsers

### Getting Help

- Check Playwright documentation: https://playwright.dev/
- Review test reports: `npm run test:report`
- Check GitHub Actions logs for CI failures
- Use debug mode to step through failing tests

## Contributing

When adding new tests:

1. Follow the existing file structure and naming conventions
2. Add appropriate test IDs to the application code
3. Include both positive and negative test cases
4. Add visual tests for new components
5. Update this README if adding new test categories

## Maintenance

Regular maintenance tasks:

- Update snapshots when UI changes are intentional
- Review and update test selectors when application structure changes
- Monitor test performance and optimize slow tests
- Keep Playwright and dependencies up to date
- Review and update CI/CD configuration as needed
