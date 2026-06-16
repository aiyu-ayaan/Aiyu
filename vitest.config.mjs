import { defineConfig } from 'vitest/config';

export default defineConfig({
  // This project writes JSX inside .js files. Tell esbuild to parse src/*.js as JSX
  // (with the automatic runtime) so components and tests transform correctly.
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
    jsx: 'automatic',
  },
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
