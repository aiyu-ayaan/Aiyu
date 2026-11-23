import { defineConfig, transformWithOxc, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';

const src = fileURLToPath(new URL('../src', import.meta.url));
const shim = (f: string) => fileURLToPath(new URL(`./src/shims/${f}`, import.meta.url));

// The shared components write JSX in .js files; Vite only parses JSX in .jsx/.tsx (same fix as vitest.config.mjs).
const jsxInJs: Plugin = {
  name: 'aiyu:jsx-in-js',
  enforce: 'pre',
  async transform(code, id) {
    const [file] = id.split('?');
    if (!file.endsWith('.js') || !file.replace(/\\/g, '/').includes('/src/')) return null;
    const out = await transformWithOxc(code, id, { lang: 'jsx', jsx: { runtime: 'automatic', importSource: 'react' } });
    return { code: out.code, map: out.map };
  },
};

// One copy of the pre-paint scripts, shared with the Next root layout.
const prepaint: Plugin = {
  name: 'aiyu:prepaint',
  async transformIndexHtml(html) {
    const { PREPAINT_THEME_PERF, PREPAINT_BOOT_GATE } = await import('../src/lib/prepaintScripts.js');
    return html.replace('/*prepaint-theme-perf*/', PREPAINT_THEME_PERF).replace('/*prepaint-boot-gate*/', PREPAINT_BOOT_GATE);
  },
};

// Titles and descriptions the Rust server puts in <head> for each route (crawlers do not run JS).
const routeMeta: Plugin = {
  name: 'aiyu:route-meta',
  apply: 'build',
  async closeBundle() {
    const { GAMES } = await import('../src/app/components/games/registry.js');
    const meta: Record<string, { title: string; description: string }> = {
      '/games': {
        title: 'Aiyu Arcade | Insert Coin',
        description:
          'Retro time-killers built into the portfolio: Byte Runner 3D, Moto Rush, Tetris, Snake, Breakout, Space Invaders, Pong, Flappy Byte, and Tic-Tac-Toe.',
      },
    };
    for (const g of GAMES) if (!g.hidden) meta[`/games/${g.slug}`] = { title: `${g.title} | Aiyu Arcade`, description: g.tagline };
    await mkdir(new URL('./dist/', import.meta.url), { recursive: true });
    await writeFile(new URL('./dist/route-meta.json', import.meta.url), JSON.stringify(meta, null, 2));
  },
};

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  // Hashed assets live under /_app/ so the Rust server can cache them forever without touching Next's paths.
  base: '/_app/',
  plugins: [jsxInJs, react(), tailwindcss(), prepaint, routeMeta],
  resolve: {
    alias: [
      { find: /^next\/link$/, replacement: shim('link.tsx') },
      { find: /^next\/navigation$/, replacement: shim('navigation.ts') },
      { find: /^next\/dynamic$/, replacement: shim('dynamic.tsx') },
      { find: /^next\/script$/, replacement: shim('script.tsx') },
      { find: /^@\//, replacement: `${src}/` },
    ],
  },
  // Tailwind runs as a Vite plugin; skip the Next-style postcss.config.mjs at the repo root.
  css: { postcss: { plugins: [] } },
  oxc: { jsx: { runtime: 'automatic', importSource: 'react' } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: '',
    sourcemap: false,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return; // "use client" in shared Next components
        warn(warning);
      },
    },
  },
  server: {
    port: 5173,
    // Dev: unported pages and the API come from the running Next/Rust server.
    proxy: { '^/(?!_app/|@|src/|node_modules/|games).*': { target: 'http://127.0.0.1:3000', changeOrigin: false } },
  },
});
