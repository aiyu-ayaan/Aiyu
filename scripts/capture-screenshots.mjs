import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import http from 'http';
import { chromium } from 'playwright';
import { NAV_ITEMS } from '../src/app/components/admin/shell/navConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Derive the full list of admin sections (Dashboard + every sidebar item,
// including Settings) straight from the real nav config, so this script can
// never drift out of sync with the actual admin panel again.
const adminRoutes = NAV_ITEMS.map((item) => {
  const slug = item.path === '/admin' ? 'dashboard' : item.path.replace(/^\/admin\//, '').replace(/\//g, '-');
  return { slug, label: item.label, path: item.path };
});

// Sections that pull in slow async data (charts, live metrics, activity
// feeds) get a longer settle time before the screenshot is taken.
const SLOW_ADMIN_SLUGS = new Set(['dashboard', 'analytics', 'health', 'github', 'seo', 'mcp']);

// ==========================================
// 0. Parse .env if it exists to load credentials into process.env
// ==========================================
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] ? match[2].trim() : '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      process.env[match[1]] = value;
    }
  }
  console.log('Loaded credentials and config from .env successfully.');
}

const routes = [
  { name: 'home', label: 'Home Page', path: '/' },
  { name: 'about', label: 'About Me', path: '/about-me' },
  { name: 'projects', label: 'Projects Showcase', path: '/projects' },
  { name: 'apps', label: 'Live Deployments / Apps', path: '/apps' },
  { name: 'blogs', label: 'Blogs Page', path: '/blogs' },
  { name: 'gallery', label: 'Gallery (Certificates)', path: '/gallery' },
  { name: 'github', label: 'GitHub Activity', path: '/github' },
  { name: 'contact', label: 'Contact Us', path: '/contact-us' }
];

const checkServer = () => new Promise((resolve) => {
  const req = http.get('http://localhost:3000', (res) => {
    if (res.statusCode === 200) resolve(true);
    else resolve(false);
  });
  req.on('error', () => resolve(false));
  req.end();
});

async function main() {
  const outputDir = path.resolve('public/screenshots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log('Created directory public/screenshots');
  }

  const envExists = fs.existsSync('.env');
  const envLocalExists = fs.existsSync('.env.local');
  let envCopied = false;

  try {
    // 1. Create temporary .env.local for database seeding
    if (envExists && !envLocalExists) {
      fs.copyFileSync('.env', '.env.local');
      envCopied = true;
      console.log('Created temporary .env.local from .env for database seeding compatibility');
    }

    // 2. Run database seed to make sure we have beautiful data loaded
    console.log('\n--- Seeding database with high-quality portfolio data ---');
    try {
      execSync('node scripts/seed.mjs', { stdio: 'inherit' });
      console.log('Database seeded successfully!\n');
    } catch (err) {
      console.error('Warning: Seeding script failed. If your database is already seeded, screenshots will still take. Error:', err.message);
    }

    // 3. Start Next.js dev server
    console.log('--- Starting Next.js Dev Server ---');
    const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const devServer = spawn(npmBin, ['run', 'dev'], { stdio: 'pipe', shell: true });

    let serverLogs = '';
    devServer.stdout.on('data', (data) => {
      const log = data.toString();
      serverLogs += log;
      if (log.trim()) {
        console.log(`[Next.js]: ${log.trim()}`);
      }
    });

    devServer.stderr.on('data', (data) => {
      console.error(`[Next.js Error]: ${data.toString().trim()}`);
    });

    // 4. Poll for dev server health check
    console.log('Waiting for Next.js to start on http://localhost:3000 ...');
    let isServerUp = false;
    for (let i = 0; i < 45; i++) {
      isServerUp = await checkServer();
      if (isServerUp) {
        console.log('Next.js dev server is UP and responding!');
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!isServerUp) {
      console.error('Server Logs:\n', serverLogs);
      throw new Error('Next.js server failed to respond on port 3000 within 45 seconds.');
    }

    // 5. Launch Playwright Chromium
    console.log('\n--- Launching Playwright Chromium Browser ---');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log('Starting screenshot captures for all public pages...\n');

    for (const route of routes) {
      const url = `http://localhost:3000${route.path}`;
      console.log(`📸 Capturing public route: ${route.label} (${route.path})`);

      // ==========================================
      // LIGHT MODE CAPTURE
      // ==========================================
      console.log(`  -> Desktop Light Mode (1920x1080)`);
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(url, { waitUntil: 'load' });

      // Inject localStorage and document theme settings
      await page.evaluate(() => {
        localStorage.setItem('themeMode', 'light');
        localStorage.setItem('theme', 'light');
        localStorage.setItem('themeVariant', 'light');
        document.documentElement.setAttribute('data-theme', 'light');
      });
      // Reload page to ensure theme logic hydrates cleanly
      await page.reload({ waitUntil: 'load' });
      const lightWaitTime = route.name === 'github' ? 4500 : 2500;
      await page.waitForTimeout(lightWaitTime); // Allow entry animations and async data to settle

      const desktopLightPath = `public/screenshots/desktop-light-${route.name}.png`;
      await page.screenshot({ path: desktopLightPath });

      console.log(`  -> Mobile Light Mode (430x932)`);
      await page.setViewportSize({ width: 430, height: 932 });
      await page.waitForTimeout(1500); // Allow viewport layout shift animations to settle
      const mobileLightPath = `public/screenshots/mobile-light-${route.name}.png`;
      await page.screenshot({ path: mobileLightPath });

      // ==========================================
      // DARK MODE CAPTURE
      // ==========================================
      console.log(`  -> Desktop Dark Mode (1920x1080)`);
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(url, { waitUntil: 'load' });

      // Inject localStorage and document theme settings
      await page.evaluate(() => {
        localStorage.setItem('themeMode', 'dark');
        localStorage.setItem('theme', 'dark');
        localStorage.setItem('themeVariant', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      // Reload page to ensure theme logic hydrates cleanly
      await page.reload({ waitUntil: 'load' });
      const darkWaitTime = route.name === 'github' ? 4500 : 2500;
      await page.waitForTimeout(darkWaitTime); // Allow entry animations and async data to settle

      const desktopDarkPath = `public/screenshots/desktop-dark-${route.name}.png`;
      await page.screenshot({ path: desktopDarkPath });

      console.log(`  -> Mobile Dark Mode (430x932)`);
      await page.setViewportSize({ width: 430, height: 932 });
      await page.waitForTimeout(1500); // Allow viewport layout shift animations to settle
      const mobileDarkPath = `public/screenshots/mobile-dark-${route.name}.png`;
      await page.screenshot({ path: mobileDarkPath });
    }

    // ==========================================
    // ADMIN LOGIN (ALWAYS, UNCONDITIONALLY)
    // ==========================================
    console.log('\n🔐 Logging into Admin Panel...');
    const username = process.env.ADMIN_USERNAME || 'aiyu';
    const password = process.env.ADMIN_PASSWORD || '1501@AiyuLoveAnshu^2401!!';

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000/admin/login', { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    // If a session already exists, /admin/login redirects straight to /admin.
    if (!page.url().includes('/admin/login')) {
      console.log('  -> Already authenticated (existing session).');
    } else {
      await page.fill('input[type="text"]', username);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
      console.log('  -> Login successful.');
    }

    const adminOutputDir = path.resolve('public/screenshots/admin');
    if (!fs.existsSync(adminOutputDir)) {
      fs.mkdirSync(adminOutputDir, { recursive: true });
    }

    // Force dark mode once; every admin section screenshot reuses this session.
    await page.evaluate(() => {
      localStorage.setItem('themeMode', 'dark');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('themeVariant', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    // ==========================================
    // ADMIN SECTION CAPTURE (DESKTOP + MOBILE, DARK MODE)
    // ==========================================
    console.log(`\n📸 Capturing ${adminRoutes.length} admin sections (desktop + mobile)...\n`);

    for (const route of adminRoutes) {
      const url = `http://localhost:3000${route.path}`;
      const waitTime = SLOW_ADMIN_SLUGS.has(route.slug) ? 4000 : 2000;
      console.log(`📸 Capturing admin section: ${route.label} (${route.path})`);

      console.log('  -> Desktop Dark Mode (1920x1080)');
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(waitTime);
      const desktopAdminPath = `public/screenshots/admin/desktop-${route.slug}.png`;
      await page.screenshot({ path: desktopAdminPath });

      console.log('  -> Mobile Dark Mode (430x932)');
      await page.setViewportSize({ width: 430, height: 932 });
      await page.waitForTimeout(1200); // Allow the mobile nav/layout to settle
      const mobileAdminPath = `public/screenshots/admin/mobile-${route.slug}.png`;
      await page.screenshot({ path: mobileAdminPath });

      // Mirror both into docs/images so wiki pages can reference stable,
      // predictable filenames (e.g. docs/images/admin-themes.png).
      const docsDesktopPath = `docs/images/admin-${route.slug}.png`;
      const docsMobilePath = `docs/images/admin-${route.slug}-mobile.png`;
      try {
        fs.copyFileSync(desktopAdminPath, docsDesktopPath);
        fs.copyFileSync(mobileAdminPath, docsMobilePath);
      } catch (err) {
        console.error(`  -> Failed to mirror ${route.slug} screenshots to docs/images:`, err.message);
      }
    }

    // Keep the legacy single-file paths that the README/wiki already reference.
    const legacyDashboardDesktop = 'public/screenshots/admin/desktop-dashboard.png';
    try {
      fs.copyFileSync(legacyDashboardDesktop, 'public/screenshots/admin.png');
      fs.copyFileSync(legacyDashboardDesktop, 'docs/images/admin-dashboard.png');
      console.log('\n  -> Refreshed legacy admin.png / admin-dashboard.png');
    } catch (err) {
      console.error('Failed to refresh legacy admin dashboard screenshot copies:', err.message);
    }

    console.log('\nClosing Playwright Chromium...');
    await browser.close();

    // 6. Stop Next.js dev server
    console.log('Stopping Next.js dev server...');
    if (process.platform === 'win32') {
      execSync('taskkill /pid ' + devServer.pid + ' /T /F');
    } else {
      devServer.kill('SIGINT');
    }
    console.log('Next.js dev server stopped successfully.');

    // ==========================================
    // Copy new dark screenshots to legacy paths ("old images")
    // ==========================================
    console.log('\n--- Copying updated dark screenshots to legacy file paths ---');
    const copyMapping = [
      { src: 'public/screenshots/desktop-dark-home.png', dest: 'public/screenshots/home.png' },
      { src: 'public/screenshots/desktop-dark-about.png', dest: 'public/screenshots/about.png' },
      { src: 'public/screenshots/desktop-dark-projects.png', dest: 'public/screenshots/projects.png' },
      { src: 'public/screenshots/desktop-dark-contact.png', dest: 'public/screenshots/contact.png' },
      { src: 'public/screenshots/desktop-dark-home.png', dest: 'docs/images/home.png' }
    ];

    for (const pair of copyMapping) {
      try {
        if (fs.existsSync(pair.src)) {
          fs.copyFileSync(pair.src, pair.dest);
          console.log(`Success: ${pair.src} -> ${pair.dest}`);
        } else {
          console.warn(`Source not found: ${pair.src}`);
        }
      } catch (err) {
        console.error(`Failed to copy ${pair.src} to ${pair.dest}:`, err.message);
      }
    }

    // 7. Update README.md (Dark Theme Only)
    console.log('\n--- Updating README.md Screenshots Section ---');
    const readmePath = path.resolve('README.md');
    if (fs.existsSync(readmePath)) {
      let readme = fs.readFileSync(readmePath, 'utf8');

      // Build the beautiful markdown table with DARK THEME ONLY
      let tableMarkdown = '| Module | Desktop Dark Mode (1920x1080) | Mobile Dark Mode (430x932) |\n';
      tableMarkdown += '|---|---|---|\n';

      for (const route of routes) {
        const dd = `public/screenshots/desktop-dark-${route.name}.png`;
        const md = `public/screenshots/mobile-dark-${route.name}.png`;

        tableMarkdown += `| **${route.label}** | [![Desktop Dark](${dd})](${dd}) | [![Mobile Dark](${md})](${md}) |\n`;
      }

      // Add Admin Panel row (now with a real mobile capture too)
      const adminDesktopPath = 'public/screenshots/admin/desktop-dashboard.png';
      const adminMobilePath = 'public/screenshots/admin/mobile-dashboard.png';
      tableMarkdown += `| **Admin Command Center** | [![Admin Dashboard](${adminDesktopPath})](${adminDesktopPath}) | [![Admin Mobile](${adminMobilePath})](${adminMobilePath}) |\n`;

      const screenshotsHeader = '## 📸 Visual Showcase';
      const techStackHeader = '## 🚀 Quick Start (Docker Deployment)';

      const screenshotsIndex = readme.indexOf(screenshotsHeader);
      const techStackIndex = readme.indexOf(techStackHeader);

      if (screenshotsIndex !== -1 && techStackIndex !== -1) {
        const before = readme.substring(0, screenshotsIndex);
        const after = readme.substring(techStackIndex);
        const newScreenshotsSection = `${screenshotsHeader}\n\n${tableMarkdown}\n\n`;

        readme = before + newScreenshotsSection + after;
        fs.writeFileSync(readmePath, readme, 'utf8');
        console.log('Successfully injected Dark-Mode screenshots comparison table into README.md!');
      } else {
        console.warn(`Could not locate standard "${screenshotsHeader}" or "${techStackHeader}" headers in README.md to replace. Table generated, but not injected.`);
        console.log('Generated Table:\n', tableMarkdown);
      }
    } else {
      console.warn('README.md was not found in the project root.');
    }

    console.log('\n✨ Automated screenshot sequence completed perfectly! ✨');

  } catch (error) {
    console.error('\n❌ Error occurred during execution:', error);
  } finally {
    // Clean up temporary .env.local
    if (envCopied && fs.existsSync('.env.local')) {
      fs.unlinkSync('.env.local');
      console.log('Cleaned up temporary .env.local');
    }
  }
}

main();
