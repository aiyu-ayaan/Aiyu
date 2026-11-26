import { createServer, defineConfig, transformWithOxc, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { globSync } from 'node:fs';

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
    // Admin route patterns for the Rust server (404 for anything else under /admin): one per _admin page.
    const adminDir = fileURLToPath(new URL('../src/app/_admin/', import.meta.url));
    const adminRoutes = globSync('**/page.js', { cwd: adminDir })
      .map((f) => `/admin/${f.replace(/\\/g, '/').replace(/\/?page\.js$/, '')}`.replace(/\/$/, ''))
      .sort();
    await writeFile(new URL('./dist/admin-routes.json', import.meta.url), JSON.stringify(adminRoutes, null, 2));
    // DEFAULT_AI_PAGE for the Rust AI Hub pages (one source of truth: src/lib/aiPageDefaults.js).
    const { DEFAULT_AI_PAGE } = await import('../src/lib/aiPageDefaults.js');
    await writeFile(new URL('./dist/ai-defaults.json', import.meta.url), JSON.stringify(DEFAULT_AI_PAGE));
    // Theme presets for /api/themes* (src/lib/themePresets.js).
    const { themePresets, legacyThemePresets } = await import('../src/lib/themePresets.js');
    await writeFile(new URL('./dist/themes.json', import.meta.url), JSON.stringify({ presets: themePresets, legacy: legacyThemePresets }));
    await writeFile(new URL('./dist/discovery.json', import.meta.url), JSON.stringify(await discoveryDocs()));
    // The admin icon picker's {title, slug} list (/api/admin/icons).
    const catalog = JSON.parse(await readFile(new URL('../node_modules/simple-icons/data/simple-icons.json', import.meta.url), 'utf8'));
    const icons = (Array.isArray(catalog) ? catalog : catalog.icons).filter((i) => i.title && i.slug);
    await writeFile(new URL('./dist/icons.json', import.meta.url), JSON.stringify(icons.map(({ title, slug }) => ({ title, slug }))));
  },
};

// The /.well-known documents (src/lib/agentDiscovery.js, mcpConfig.js). They import through the `@/` alias, so load
// them with Vite's SSR loader. The site URL is a placeholder the Rust server swaps for SITE_URL at startup.
async function discoveryDocs() {
  const previous = process.env.SITE_URL;
  process.env.SITE_URL = 'https://aiyu-site.invalid';
  const server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL('..', import.meta.url)),
    logLevel: 'error',
    resolve: { alias: { '@': src } },
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const d = await server.ssrLoadModule(`${src}/lib/agentDiscovery.js`);
    const { DEFAULT_MCP_CONFIG } = await server.ssrLoadModule(`${src}/lib/mcpConfig.js`);
    const { builtinToolCards } = await server.ssrLoadModule(`${src}/lib/mcp/tools.js`);
    const { GAMES } = await server.ssrLoadModule(`${src}/app/components/games/registry.js`);
    return {
      apiCatalog: d.getApiCatalog(),
      openapi: d.getOpenApiDocument(),
      oauth: d.getOAuthIssuerMetadata(),
      protectedResource: d.getProtectedResourceMetadata(),
      jwks: d.getJwks(),
      skillsIndex: d.getAgentSkillsIndex(),
      skills: d.AGENT_SKILL_ARTIFACTS,
      mcpDefaults: DEFAULT_MCP_CONFIG,
      mcpBuiltinTools: builtinToolCards(),
      authMd: d.getAuthMarkdown(),
      apiDocs: d.getApiDocsMarkdown(),
      mcpDocs: d.getMcpDocsMarkdown(),
      games: GAMES.filter((g) => !g.hidden).map((g) => g.slug),
    };
  } finally {
    await server.close();
    if (previous === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previous;
  }
}

// Every `next/*` import must hit a shim above: real Next modules would work through the proxy today and break at cutover.
const noNext: Plugin = {
  name: 'aiyu:no-next',
  enforce: 'pre',
  resolveId(id, importer) {
    if (/^next(\/|$)/.test(id)) throw new Error(`unshimmed import "${id}" from ${importer}`);
    return null;
  },
};

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  // Hashed assets live under /_app/ so the Rust server can cache them forever without touching Next's paths.
  base: '/_app/',
  plugins: [jsxInJs, react(), tailwindcss(), prepaint, routeMeta, noNext],
  // Some dependencies read Node's `global` (webpack polyfilled it for Next).
  define: { global: 'globalThis' },
  resolve: {
    alias: [
      { find: /^next\/link$/, replacement: shim('link.tsx') },
      { find: /^next\/navigation$/, replacement: shim('navigation.ts') },
      { find: /^next\/dynamic$/, replacement: shim('dynamic.tsx') },
      { find: /^next\/script$/, replacement: shim('script.tsx') },
      { find: /^next\/image$/, replacement: shim('image.tsx') },
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
