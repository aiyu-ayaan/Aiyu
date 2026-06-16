import { defineConfig } from 'vitest/config';
import { transformWithOxc } from 'vite';
import { fileURLToPath } from 'node:url';

// This project writes JSX inside .js files. Vite 8's built-in `vite:oxc`
// transform derives the parser language from the file extension and excludes
// `.js` by default, so JSX in a `.js` file is rejected ("JSX syntax is
// disabled"). There is no per-file `lang` override in the public `oxc` config,
// so we run oxc ourselves (which DOES accept `lang`) ahead of the built-in
// transform, converting JSX -> JS with the automatic runtime before `vite:oxc`
// touches the file.
const jsxInJs = {
  name: 'vitest:jsx-in-js',
  enforce: 'pre',
  async transform(code, id) {
    const [filepath] = id.split('?');
    if (!filepath.endsWith('.js')) return null;
    if (!filepath.replace(/\\/g, '/').includes('/src/')) return null;
    const result = await transformWithOxc(code, id, {
      lang: 'jsx',
      jsx: { runtime: 'automatic', importSource: 'react' },
    });
    return { code: result.code, map: result.map };
  },
};

export default defineConfig({
  plugins: [jsxInJs],
  // Mirror the `@/` -> `src/` path alias used by Next.js/jsconfig so modules
  // importing via the alias are resolvable under Vitest.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Native .jsx/.tsx files use the automatic React runtime.
  oxc: { jsx: { runtime: 'automatic', importSource: 'react' } },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  // Avoid loading the project's Tailwind v4 PostCSS config during tests.
  css: { postcss: { plugins: [] } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.js',
    include: ['src/**/*.test.{js,jsx}'],
    css: false,
  },
});
