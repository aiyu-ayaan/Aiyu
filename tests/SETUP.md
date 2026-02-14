# Test Setup Guide

This guide explains how to set up the testing environment for the portfolio website.

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Playwright Browsers

```bash
npx playwright install
```

### 3. Create Test Admin User

**Important**: The tests require a test admin user to be created in your database. The tests use hardcoded credentials:

- **Username**: `test_admin`
- **Password**: `test_password_123`

#### Option 1: Manual Database Setup

If you have direct database access, create a user with these credentials in your admin users collection.

#### Option 2: Through Admin Panel (if available)

1. Start your application: `npm run dev`
2. Navigate to `/admin/login`
3. If you have an existing admin account, log in and create the test user
4. If no admin exists, you may need to create the first admin through your application's setup process

#### Option 3: Environment Variable Override

If your application supports creating an admin via environment variables, you can temporarily add these to your `.env`:

```env
# Temporary test credentials (remove after setup)
ADMIN_USERNAME=test_admin
ADMIN_PASSWORD=test_password_123
```

Then restart your application to create the user, and remove these lines afterward.

### 4. Verify Setup

Run a quick test to verify everything works:

```bash
# Test just the login functionality
npx playwright test tests/admin/login.spec.js --grep "should redirect to admin dashboard"
```

## Test Credentials Explained

The test setup uses hardcoded credentials to avoid dependency on environment files:

```javascript
const TEST_ADMIN_CREDENTIALS = {
  username: 'test_admin',
  password: 'test_password_123'
};
```

### Why Hardcoded Credentials?

1. **No Environment Dependencies**: Tests work without `.env` files
2. **Consistent Testing**: Same credentials across all test environments
3. **Simplified CI/CD**: No need to manage secrets in GitHub Actions
4. **Isolation**: Test user is separate from production admin users

### Security Considerations

- The test credentials are **only** used in automated tests
- They should **never** be used in production
- The test user should have limited permissions if possible
- Consider using a separate test database

## Running Tests

### All Tests

```bash
npm test
```

### Specific Test Categories

```bash
# Public site tests only
npm run test:public

# Admin panel tests only
npm run test:admin

# Visual regression tests only
npm run test:visual
```

### Debug Mode

```bash
# Run tests with visible browser for debugging
npm run test:headed

# Run tests with Playwright UI for step-by-step debugging
npm run test:ui

# Run tests in debug mode with breakpoints
npm run test:debug
```

## Troubleshooting

### Admin Tests Fail

**Problem**: Admin tests can't log in
**Solution**: 
1. Verify the test admin user exists in your database
2. Check that the credentials match exactly: `test_admin` / `test_password_123`
3. Ensure your admin login page is accessible at `/admin/login`

### Tests Time Out

**Problem**: Tests fail with timeout errors
**Solution**:
1. Ensure your application is running: `npm run dev`
2. Check the port is correct (default: 3000)
3. Verify the `NEXT_PUBLIC_BASE_URL` environment variable if set

### Browser Not Found

**Problem**: "Browser not found" errors
**Solution**:
```bash
npx playwright install
```

### Visual Tests Fail

**Problem**: Visual regression tests fail on first run
**Solution**:
```bash
# Update snapshots on first run
npm run test:update-snapshots
```

## Test Data

The tests are designed to work with minimal data:

- **Public Tests**: Work with existing content (projects, blogs, etc.)
- **Admin Tests**: Test the admin interface without modifying real data
- **Visual Tests**: Take snapshots of the current state

### Best Practices

1. **Use Test Database**: If possible, use a separate test database
2. **Backup Data**: Backup your database before running tests
3. **Clean Test Data**: Remove test data after running tests
4. **Regular Updates**: Update snapshots when UI changes intentionally

## CI/CD Considerations

In GitHub Actions, the tests will:

1. Start the application automatically
2. Use the hardcoded test credentials
3. Run all test suites
4. Upload results as artifacts

No additional secrets are required for basic functionality.
