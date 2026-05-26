import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import http from 'http';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      console.log(`📸 Capturing: ${route.label} (${route.path})`);

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
      await page.waitForTimeout(2000); // Allow entry animations (framer-motion) to settle

      const desktopLightPath = `public/screenshots/desktop-light-${route.name}.png`;
      await page.screenshot({ path: desktopLightPath });

      console.log(`  -> Mobile Light Mode (430x932)`);
      await page.setViewportSize({ width: 430, height: 932 });
      await page.waitForTimeout(1000); // Allow viewport layout shift animations to settle
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
      await page.waitForTimeout(2000); // Allow entry animations (framer-motion) to settle

      const desktopDarkPath = `public/screenshots/desktop-dark-${route.name}.png`;
      await page.screenshot({ path: desktopDarkPath });

      console.log(`  -> Mobile Dark Mode (430x932)`);
      await page.setViewportSize({ width: 430, height: 932 });
      await page.waitForTimeout(1000); // Allow viewport layout shift animations to settle
      const mobileDarkPath = `public/screenshots/mobile-dark-${route.name}.png`;
      await page.screenshot({ path: mobileDarkPath });
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

    // 7. Update README.md
    console.log('\n--- Updating README.md Screenshots Section ---');
    const readmePath = path.resolve('README.md');
    if (fs.existsSync(readmePath)) {
      let readme = fs.readFileSync(readmePath, 'utf8');

      // Build the beautiful markdown table
      let tableMarkdown = '| Page | Desktop Light Mode (1920x1080) | Desktop Dark Mode (1920x1080) | Mobile Light Mode (430x932) | Mobile Dark Mode (430x932) |\n';
      tableMarkdown += '|---|---|---|---|---|\n';

      for (const route of routes) {
        const dl = `public/screenshots/desktop-light-${route.name}.png`;
        const dd = `public/screenshots/desktop-dark-${route.name}.png`;
        const ml = `public/screenshots/mobile-light-${route.name}.png`;
        const md = `public/screenshots/mobile-dark-${route.name}.png`;

        tableMarkdown += `| **${route.label}** | [![Desktop Light](${dl})](${dl}) | [![Desktop Dark](${dd})](${dd}) | [![Mobile Light](${ml})](${ml}) | [![Mobile Dark](${md})](${md}) |\n`;
      }

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
        console.log('Successfully injected screenshots comparison table into README.md!');
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
