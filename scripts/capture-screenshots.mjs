import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import http from 'http';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    // ADMIN DASHBOARD CAPTURE (DARK MODE)
    // ==========================================
    console.log('\n📸 Capturing Admin Dashboard (/admin)');
    const adminUrl = 'http://localhost:3000/admin';
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(adminUrl, { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // Check if we are on the login page or dashboard
    const isLoginPage = await page.$('input[type="text"]');
    if (isLoginPage) {
      console.log('  -> Logging into Admin Panel...');
      const username = process.env.ADMIN_USERNAME || 'aiyu';
      const password = process.env.ADMIN_PASSWORD || '1501@AiyuLoveAnshu^2401!!';
      await page.fill('input[type="text"]', username);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');

      // Wait for login transition to complete
      await page.waitForNavigation({ waitUntil: 'load' }).catch(() => {});
      await page.waitForTimeout(3000);
    }

    // Set theme to dark for admin panel
    await page.evaluate(() => {
      localStorage.setItem('themeMode', 'dark');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('themeVariant', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(3000); // Allow charts, count widgets, and database stats to populate

    const adminDashboardPath = 'public/screenshots/admin.png';
    await page.screenshot({ path: adminDashboardPath });
    console.log(`  -> Admin Dashboard screenshot captured at ${adminDashboardPath}`);

    // Copy admin screenshot to docs/images/admin-dashboard.png too
    const legacyAdminPath = 'docs/images/admin-dashboard.png';
    try {
      fs.copyFileSync(adminDashboardPath, legacyAdminPath);
      console.log(`  -> Copied admin dashboard screenshot to ${legacyAdminPath}`);
    } catch (err) {
      console.error(`Failed to copy admin screenshot to ${legacyAdminPath}:`, err.message);
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
      let tableMarkdown = '| Page | Desktop Dark Mode (1920x1080) | Mobile Dark Mode (430x932) |\n';
      tableMarkdown += '|---|---|---|\n';

      for (const route of routes) {
        const dd = `public/screenshots/desktop-dark-${route.name}.png`;
        const md = `public/screenshots/mobile-dark-${route.name}.png`;

        tableMarkdown += `| **${route.label}** | [![Desktop Dark](${dd})](${dd}) | [![Mobile Dark](${md})](${md}) |\n`;
      }

      // Add Admin Panel row
      const adminPath = 'public/screenshots/admin.png';
      tableMarkdown += `| **Admin Dashboard** | [![Admin Dashboard](${adminPath})](${adminPath}) | *Desktop Only* |\n`;

      const screenshotsHeader = '## Screenshots';
      const techStackHeader = '## 🛠️ Tech Stack';

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
        console.warn('Could not locate standard ## Screenshots or ## 🛠️ Tech Stack headers in README.md to replace. Table generated, but not injected.');
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
