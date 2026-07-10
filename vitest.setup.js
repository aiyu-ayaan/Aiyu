import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// lib/jwt.js throws at import time without this; mcpConfig.test.js pulls it in
// transitively (mcp/tools → aiSections → auth → jwt). CI has no JWT_SECRET.
process.env.JWT_SECRET ??= 'vitest-test-secret';

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
