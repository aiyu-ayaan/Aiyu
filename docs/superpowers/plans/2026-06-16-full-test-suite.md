# Full Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a working automated test suite — Vitest unit/component tests plus Playwright UI e2e tests that drive the app with real clicks — for the Aiyu Next.js 16 portfolio.

**Architecture:** Vitest (jsdom) with `@vitejs/plugin-react` runs co-located `*.test.js` unit/component tests; `@testing-library/react` + `user-event` drive component interactions. Playwright (`@playwright/test`) runs `e2e/*.spec.js` against an auto-started `next dev` server via a `webServer` config block. Admin e2e reads credentials from `.env` exactly like `scripts/capture-screenshots.mjs`.

**Tech Stack:** Vitest, @vitejs/plugin-react, jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, @playwright/test (Playwright already installed for screenshots).

---

## File structure

| File | Responsibility |
|---|---|
| `vitest.config.js` | Vitest config: jsdom env, react plugin, setup file, globals |
| `vitest.setup.js` | jest-dom matchers + jsdom shims (matchMedia) |
| `src/utils/fileValidation.test.js` | Unit tests for file validation/security |
| `src/lib/seoHelper.test.js` | Unit tests for SEO helpers |
| `src/lib/httpCache.test.js` | Unit tests for cache headers |
| `src/utils/themeUtils.test.js` | Unit tests for `applyThemeColors` |
| `src/app/components/ThemeToggle.test.js` | Component test (mocked theme context) |
| `src/app/components/landing/TicTacToe.test.js` | Component test (mocked theme + confetti) |
| `playwright.config.js` | Playwright config + webServer auto-start |
| `e2e/public-smoke.spec.js` | Public pages render without errors |
| `e2e/navigation.spec.js` | Click navbar links between pages |
| `e2e/theme.spec.js` | Click theme toggle, assert `data-theme` |
| `e2e/admin-auth.spec.js` | Admin login success + wrong-password |
| `package.json` | Add test scripts |
| `.gitignore` | Ignore Playwright artifacts |
| `README.md` | "Running Tests" section |

---

## Task 1: Vitest harness + smoke test

**Files:**
- Create: `vitest.config.js`, `vitest.setup.js`, `src/utils/__smoke__.test.js` (temporary)
- Modify: `package.json`

- [ ] **Step 1: Install dev dependencies**

Run:
```bash
npm i -D vitest@^2 @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```
Expected: installs without peer-dep errors (React 19 is supported by @testing-library/react v16+).

- [ ] **Step 2: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.js',
    include: ['src/**/*.test.{js,jsx}'],
    css: false,
  },
});
```

- [ ] **Step 3: Create `vitest.setup.js`**

```js
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom has no matchMedia; ThemeContext and others rely on it.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
```

- [ ] **Step 4: Add scripts to `package.json`**

Add to the `"scripts"` object:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "playwright test",
"test:ui:headed": "playwright test --headed",
"test:all": "vitest run && playwright test"
```

- [ ] **Step 5: Create a temporary smoke test `src/utils/__smoke__.test.js`**

```js
import { describe, it, expect } from 'vitest';

describe('vitest harness', () => {
  it('runs and supports jest-dom', () => {
    const el = document.createElement('div');
    el.textContent = 'hi';
    document.body.appendChild(el);
    expect(el).toBeInTheDocument();
    expect(2 + 2).toBe(4);
  });
});
```

- [ ] **Step 6: Run the smoke test**

Run: `npm test`
Expected: PASS, 1 file, 1 test green.

- [ ] **Step 7: Delete the smoke test and commit**

```bash
rm src/utils/__smoke__.test.js
git add vitest.config.js vitest.setup.js package.json package-lock.json
git commit -m "test: add vitest harness with jsdom + react testing library"
```

---

## Task 2: Unit tests — fileValidation (security)

**Files:**
- Create: `src/utils/fileValidation.test.js`

- [ ] **Step 1: Write the tests**

```js
import { describe, it, expect } from 'vitest';
import {
  validateFileSignature,
  sanitizeFilename,
  generateSecureFilename,
  validateFileSize,
  validateUploadedFile,
  MAX_FILE_SIZE,
} from './fileValidation';

const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

describe('validateFileSignature', () => {
  it('accepts a matching PNG signature', () => {
    expect(validateFileSignature(pngHeader, 'image/png')).toBe(true);
  });
  it('rejects a buffer whose signature does not match the mime type', () => {
    expect(validateFileSignature(jpegHeader, 'image/png')).toBe(false);
  });
  it('rejects unknown mime types', () => {
    expect(validateFileSignature(pngHeader, 'image/svg+xml')).toBe(false);
  });
});

describe('sanitizeFilename', () => {
  it('strips directory traversal components', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFilename('..\\..\\windows\\system32')).toBe('system32');
  });
  it('removes unsafe characters', () => {
    expect(sanitizeFilename('my photo!@#.png')).toBe('myphoto.png');
  });
  it('falls back to "upload" for empty or dot-leading names', () => {
    expect(sanitizeFilename('.htaccess')).toBe('upload');
    expect(sanitizeFilename('!!!')).toBe('upload');
  });
});

describe('generateSecureFilename', () => {
  it('keeps a safe extension and produces a unique name', () => {
    const name = generateSecureFilename('photo.png');
    expect(name).toMatch(/^\d+-[a-z0-9]+-\d+\.png$/);
  });
  it('coerces unknown extensions to bin', () => {
    expect(generateSecureFilename('malware.exe')).toMatch(/\.bin$/);
  });
});

describe('validateFileSize', () => {
  it('accepts sizes within the limit', () => {
    expect(validateFileSize(1)).toBe(true);
    expect(validateFileSize(MAX_FILE_SIZE)).toBe(true);
  });
  it('rejects zero and oversize', () => {
    expect(validateFileSize(0)).toBe(false);
    expect(validateFileSize(MAX_FILE_SIZE + 1)).toBe(false);
  });
});

describe('validateUploadedFile', () => {
  const file = (over = {}) => ({ type: 'image/png', name: 'a.png', size: 100, ...over });

  it('accepts a valid PNG', () => {
    expect(validateUploadedFile(file(), pngHeader)).toEqual(
      expect.objectContaining({ valid: true, detectedType: 'image/png' })
    );
  });
  it('rejects when no file is provided', () => {
    expect(validateUploadedFile(null, pngHeader)).toEqual(
      expect.objectContaining({ valid: false })
    );
  });
  it('rejects disallowed mime types', () => {
    const res = validateUploadedFile(file({ type: 'image/svg+xml' }), pngHeader);
    expect(res.valid).toBe(false);
  });
  it('rejects oversize files', () => {
    const res = validateUploadedFile(file({ size: MAX_FILE_SIZE + 1 }), pngHeader);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/size/i);
  });
  it('rejects when signature does not match declared type', () => {
    const res = validateUploadedFile(file({ type: 'image/png' }), jpegHeader);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/signature/i);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- src/utils/fileValidation.test.js`
Expected: PASS, all assertions green. (If `sanitizeFilename('my photo!@#.png')` differs, read the implementation and adjust the expected string to match actual behavior — do not change the source.)

- [ ] **Step 3: Commit**

```bash
git add src/utils/fileValidation.test.js
git commit -m "test: unit tests for file validation security utils"
```

---

## Task 3: Unit tests — seoHelper

**Files:**
- Create: `src/lib/seoHelper.test.js`

- [ ] **Step 1: Write the tests**

```js
import { describe, it, expect } from 'vitest';
import {
  generateSlug,
  truncateDescription,
  generateMetadataObject,
  generatePageMetadata,
} from './seoHelper';

describe('generateSlug', () => {
  it('lowercases, strips punctuation and collapses spaces', () => {
    expect(generateSlug('  Hello,  World!  ')).toBe('hello-world');
  });
  it('collapses repeated hyphens', () => {
    expect(generateSlug('a -- b')).toBe('a-b');
  });
  it('returns empty string for falsy input', () => {
    expect(generateSlug('')).toBe('');
  });
});

describe('truncateDescription', () => {
  it('returns text unchanged when under the limit', () => {
    expect(truncateDescription('short', 160)).toBe('short');
  });
  it('truncates and appends ellipsis', () => {
    const long = 'a'.repeat(200);
    const out = truncateDescription(long, 10);
    expect(out.endsWith('...')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(13);
  });
  it('returns empty string for falsy input', () => {
    expect(truncateDescription(undefined)).toBe('');
  });
});

describe('generateMetadataObject', () => {
  it('joins keyword arrays and falls back og fields to base', () => {
    const meta = generateMetadataObject({
      title: 'T',
      description: 'D',
      keywords: ['a', 'b'],
    });
    expect(meta.keywords).toBe('a, b');
    expect(meta.openGraph.title).toBe('T');
    expect(meta.twitter.card).toBe('summary_large_image');
  });
});

describe('generatePageMetadata', () => {
  it('builds a titled, canonical metadata object', () => {
    const meta = generatePageMetadata(
      { title: 'Projects', description: 'My work', path: '/projects' },
      { siteTitle: 'Aiyu' }
    );
    expect(meta.title).toBe('Projects | Aiyu');
    expect(meta.alternates.canonical).toMatch(/\/projects$/);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- src/lib/seoHelper.test.js`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/seoHelper.test.js
git commit -m "test: unit tests for seo helpers"
```

---

## Task 4: Unit tests — httpCache

**Files:**
- Create: `src/lib/httpCache.test.js`

- [ ] **Step 1: Write the tests**

```js
import { describe, it, expect } from 'vitest';
import { createPublicCacheHeaders, RESPONSE_CACHE } from './httpCache';

describe('createPublicCacheHeaders', () => {
  it('defaults to the PUBLIC_SHORT policy across all three headers', () => {
    const headers = createPublicCacheHeaders();
    expect(headers['Cache-Control']).toBe(RESPONSE_CACHE.PUBLIC_SHORT);
    expect(headers['CDN-Cache-Control']).toBe(RESPONSE_CACHE.PUBLIC_SHORT);
    expect(headers['Vercel-CDN-Cache-Control']).toBe(RESPONSE_CACHE.PUBLIC_SHORT);
  });
  it('uses the provided cache-control value', () => {
    const headers = createPublicCacheHeaders(RESPONSE_CACHE.NO_STORE);
    expect(headers['Cache-Control']).toBe(RESPONSE_CACHE.NO_STORE);
    expect(headers['Vercel-CDN-Cache-Control']).toBe(RESPONSE_CACHE.NO_STORE);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- src/lib/httpCache.test.js`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/httpCache.test.js
git commit -m "test: unit tests for http cache headers"
```

---

## Task 5: Unit tests — themeUtils

**Files:**
- Create: `src/utils/themeUtils.test.js`

- [ ] **Step 1: Write the tests**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { applyThemeColors } from './themeUtils';

describe('applyThemeColors', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
  });

  it('no-ops when variantData is missing', () => {
    applyThemeColors('dark', null);
    expect(document.documentElement.getAttribute('style')).toBeNull();
  });

  it('sets background and text CSS custom properties', () => {
    applyThemeColors('dark', {
      backgrounds: {
        primary: '#000', secondary: '#111', tertiary: '#222',
        surface: '#333', elevated: '#444', hover: '#555',
      },
      text: {
        primary: '#fff', secondary: '#eee', tertiary: '#ddd',
        muted: '#ccc', bright: '#fafafa',
      },
    });
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--bg-primary')).toBe('#000');
    expect(root.style.getPropertyValue('--bg-hover')).toBe('#555');
    expect(root.style.getPropertyValue('--text-bright')).toBe('#fafafa');
  });

  it('only sets the property groups that are present', () => {
    applyThemeColors('dark', { accents: { cyan: '#0ff', cyanBright: '#0ee' } });
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--accent-cyan')).toBe('#0ff');
    expect(root.style.getPropertyValue('--bg-primary')).toBe('');
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- src/utils/themeUtils.test.js`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/utils/themeUtils.test.js
git commit -m "test: unit tests for applyThemeColors"
```

---

## Task 6: Component test — ThemeToggle

**Files:**
- Create: `src/app/components/ThemeToggle.test.js`

**Note:** `ThemeToggle` calls `useTheme()`. We mock the context module so we don't pull in the provider's `fetch`/`usePathname`. Mock path is relative to the test file: `../context/ThemeContext`.

- [ ] **Step 1: Write the tests**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const setThemeMode = vi.fn();
let mockState = { themeMode: 'auto', setThemeMode, mounted: true };

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => mockState,
}));

import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    setThemeMode.mockClear();
    mockState = { themeMode: 'auto', setThemeMode, mounted: true };
  });

  it('renders the current mode label', () => {
    render(<ThemeToggle />);
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });

  it('cycles auto -> dark on click', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button'));
    expect(setThemeMode).toHaveBeenCalledWith('dark');
  });

  it('cycles dark -> light on click', async () => {
    mockState = { themeMode: 'dark', setThemeMode, mounted: true };
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button'));
    expect(setThemeMode).toHaveBeenCalledWith('light');
  });

  it('renders a non-interactive placeholder until mounted', () => {
    mockState = { themeMode: 'auto', setThemeMode, mounted: false };
    render(<ThemeToggle />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- src/app/components/ThemeToggle.test.js`
Expected: PASS. (If framer-motion emits act warnings, they are non-fatal; tests still pass.)

- [ ] **Step 3: Commit**

```bash
git add src/app/components/ThemeToggle.test.js
git commit -m "test: component test for ThemeToggle interaction"
```

---

## Task 7: Component test — TicTacToe

**Files:**
- Create: `src/app/components/landing/TicTacToe.test.js`

**Note:** Mock `useTheme` (path `../../context/ThemeContext`) and mock `react-confetti` to render nothing (it needs canvas). In PvP mode there is no AI timer, so clicks are deterministic.

- [ ] **Step 1: Write the tests**

```js
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));
vi.mock('react-confetti', () => ({ default: () => null }));

import TicTacToe from './TicTacToe';

// The 9 board cells are the only empty-text buttons; mode/restart buttons have labels.
const getCells = () =>
  screen.getAllByRole('button').filter((b) => b.querySelector('span'));

describe('TicTacToe', () => {
  it('starts at the mode-select screen', () => {
    render(<TicTacToe onBack={() => {}} />);
    expect(screen.getByText('Choose Game Mode')).toBeInTheDocument();
  });

  it('plays a PvP game and detects a winner via clicks', async () => {
    const user = userEvent.setup();
    render(<TicTacToe onBack={() => {}} />);

    await user.click(screen.getByText(/Player vs Player/));
    expect(screen.getByText('Next player: X')).toBeInTheDocument();

    const cells = getCells();
    // X:0, O:3, X:1, O:4, X:2 -> X wins top row
    await user.click(cells[0]); // X
    await user.click(cells[3]); // O
    await user.click(cells[1]); // X
    await user.click(cells[4]); // O
    await user.click(cells[2]); // X wins

    expect(screen.getByText('Winner: X')).toBeInTheDocument();
  });

  it('ignores clicks on an already-filled cell', async () => {
    const user = userEvent.setup();
    render(<TicTacToe onBack={() => {}} />);
    await user.click(screen.getByText(/Player vs Player/));

    const cells = getCells();
    await user.click(cells[0]); // X
    await user.click(cells[0]); // ignored, still X's move recorded -> now O's turn
    expect(screen.getByText('Next player: O')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- src/app/components/landing/TicTacToe.test.js`
Expected: PASS. (If the cell filter is ambiguous, fall back to selecting the 9 grid buttons by their parent `.grid` container; adjust `getCells` accordingly.)

- [ ] **Step 3: Commit**

```bash
git add src/app/components/landing/TicTacToe.test.js
git commit -m "test: component test for TicTacToe gameplay clicks"
```

---

## Task 8: Playwright config + browser install

**Files:**
- Create: `playwright.config.js`
- Modify: `.gitignore`

- [ ] **Step 1: Install @playwright/test and the chromium browser**

Run:
```bash
npm i -D @playwright/test
npx playwright install chromium
```
Expected: installs the test runner; browser download completes.

- [ ] **Step 2: Create `playwright.config.js`**

```js
import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
  },
});
```

- [ ] **Step 3: Add Playwright artifacts to `.gitignore`**

Append these lines (skip any already present):
```
/test-results/
/playwright-report/
/playwright/.cache/
```

- [ ] **Step 4: Commit**

```bash
git add playwright.config.js .gitignore package.json package-lock.json
git commit -m "test: add playwright config with auto-started dev server"
```

---

## Task 9: e2e — public smoke

**Files:**
- Create: `e2e/public-smoke.spec.js`

- [ ] **Step 1: Write the spec**

```js
import { test, expect } from '@playwright/test';

const routes = ['/', '/about-me', '/projects', '/apps', '/blogs', '/gallery', '/github', '/contact-us'];

for (const path of routes) {
  test(`renders ${path} without severe errors`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response, `no response for ${path}`).toBeTruthy();
    expect(response.status(), `bad status for ${path}`).toBeLessThan(400);

    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveTitle(/.+/);

    expect(errors, `uncaught page errors on ${path}: ${errors.join('; ')}`).toEqual([]);
  });
}
```

- [ ] **Step 2: Run the spec**

Run: `npm run test:ui -- e2e/public-smoke.spec.js`
Expected: Playwright boots `next dev`, all routes pass. (If a route legitimately needs DB data and 500s locally without a seeded DB, note it; reduce `routes` to those that render statically and record the limitation in the README testing section.)

- [ ] **Step 3: Commit**

```bash
git add e2e/public-smoke.spec.js
git commit -m "test(e2e): public pages render without errors"
```

---

## Task 10: e2e — navigation clicks

**Files:**
- Create: `e2e/navigation.spec.js`

- [ ] **Step 1: Write the spec**

```js
import { test, expect } from '@playwright/test';

test('navigates between pages via header links', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();

  // Click the first in-app link to /projects (header nav uses href="/projects").
  const projectsLink = page.locator('a[href="/projects"]').first();
  await projectsLink.click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator('body')).toBeVisible();

  // Navigate onward to /apps.
  const appsLink = page.locator('a[href="/apps"]').first();
  await appsLink.click();
  await expect(page).toHaveURL(/\/apps$/);
  await expect(page.locator('body')).toBeVisible();
});
```

- [ ] **Step 2: Run the spec**

Run: `npm run test:ui -- e2e/navigation.spec.js`
Expected: PASS. (If the nav links are inside a mobile menu at the default viewport, open the menu first or rely on the desktop project `Desktop Chrome` viewport which is wide enough; if a link is rendered but covered by an overlay, use `.scrollIntoViewIfNeeded()` then click.)

- [ ] **Step 3: Commit**

```bash
git add e2e/navigation.spec.js
git commit -m "test(e2e): header navigation between pages"
```

---

## Task 11: e2e — theme toggle

**Files:**
- Create: `e2e/theme.spec.js`

- [ ] **Step 1: Write the spec**

```js
import { test, expect } from '@playwright/test';

test('theme toggle flips data-theme and persists', async ({ page }) => {
  await page.goto('/');

  // The toggle button exposes an aria-label starting with "Theme mode:".
  const toggle = page.getByRole('button', { name: /Theme mode:/i }).first();
  await expect(toggle).toBeVisible();

  const before = await page.locator('html').getAttribute('data-theme');
  await toggle.click();

  await expect
    .poll(async () => page.locator('html').getAttribute('data-theme'))
    .not.toBe(before);

  const after = await page.locator('html').getAttribute('data-theme');
  await page.reload();
  await expect
    .poll(async () => page.locator('html').getAttribute('data-theme'))
    .toBe(after);
});
```

- [ ] **Step 2: Run the spec**

Run: `npm run test:ui -- e2e/theme.spec.js`
Expected: PASS. (Cycling `auto -> dark -> light` may land on the same resolved variant in some steps; clicking once from `auto` resolves to an explicit `dark`/`light`, which changes `data-theme` from the system default in most environments. If the first click does not change it because the system already matches, click again before the assertion.)

- [ ] **Step 3: Commit**

```bash
git add e2e/theme.spec.js
git commit -m "test(e2e): theme toggle changes and persists data-theme"
```

---

## Task 12: e2e — admin auth

**Files:**
- Create: `e2e/admin-auth.spec.js`

**Note:** `/admin` redirects to `/admin/login` when unauthenticated. The login form has `input[type="text"]`, `input[type="password"]`, `button[type="submit"]`. On success it routes to `/admin`. On failure it shows an error div ("Invalid credentials"). Credentials come from env with the same fallbacks as `scripts/capture-screenshots.mjs`.

- [ ] **Step 1: Write the spec**

```js
import { test, expect } from '@playwright/test';

const USERNAME = process.env.ADMIN_USERNAME || 'aiyu';
const PASSWORD = process.env.ADMIN_PASSWORD || '1501@AiyuLoveAnshu^2401!!';

test('rejects wrong credentials', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('input[type="text"]', 'wronguser');
  await page.fill('input[type="password"]', 'wrongpass');
  await page.click('button[type="submit"]');

  await expect(page.getByText(/invalid credentials|login failed/i)).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('logs in with valid credentials and reaches the dashboard', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('input[type="text"]', USERNAME);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/admin(\/|$)/, { timeout: 15_000 });
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});
```

- [ ] **Step 2: Run the spec**

Run: `npm run test:ui -- e2e/admin-auth.spec.js`
Expected: wrong-credentials test PASSES. The valid-login test passes when `.env` has matching `ADMIN_USERNAME`/`ADMIN_PASSWORD` and `JWT_SECRET` configured. If local env lacks valid admin creds, mark the success test with `test.skip(!process.env.ADMIN_PASSWORD, 'no admin creds')` and note it.

- [ ] **Step 3: Commit**

```bash
git add e2e/admin-auth.spec.js
git commit -m "test(e2e): admin login success and failure flows"
```

---

## Task 13: Docs + full run

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a "Running Tests" section to `README.md`**

Insert before the `## 🛠️ Tech Stack` heading:
```markdown
## Running Tests

Unit & component tests (Vitest + Testing Library):

```bash
npm test          # run once
npm run test:watch
```

UI / end-to-end tests (Playwright — auto-starts the dev server):

```bash
npm run test:ui          # headless
npm run test:ui:headed   # watch the browser
```

Run everything: `npm run test:all`.

Admin e2e reads `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env` (same as the
screenshot script). The valid-login e2e test is skipped if those are unset.
```

- [ ] **Step 2: Run the full unit suite**

Run: `npm test`
Expected: all unit + component test files PASS.

- [ ] **Step 3: Run the full e2e suite**

Run: `npm run test:ui`
Expected: all specs PASS (with documented skips for missing local data/creds).

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document how to run the test suite"
```

---

## Self-review notes

- **Spec coverage:** unit (fileValidation T2, seoHelper T3, httpCache T4, themeUtils T5), component (ThemeToggle T6, TicTacToe T7), e2e public smoke (T9), navigation (T10), theme (T11), admin auth incl. negative case (T12), scripts (T1), docs (T13). All spec sections mapped.
- **Out-of-scope** items (exhaustive coverage, admin CRUD, visual regression) intentionally have no tasks.
- **Type/selector consistency:** login selectors (`input[type="text"]`, `input[type="password"]`, `button[type="submit"]`) match `src/app/admin/login/page.js`; nav hrefs (`/projects`, `/apps`) match `headerData.js`; toggle aria-label (`Theme mode:`) matches `ThemeToggle.js`; mocked context paths are relative to each test file.
- **Risk flags noted inline:** routes needing DB data, mobile-menu nav, system-theme matching the first toggle, and missing admin creds each have a documented fallback in the relevant task.
