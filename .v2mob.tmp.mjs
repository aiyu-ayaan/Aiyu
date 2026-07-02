import { chromium, devices } from '@playwright/test';
const dir = 'C:/Users/ROOT/AppData/Local/Temp/claude/D--VS-Code-Next-JS-Aiyu/4826326f-6062-475c-86ab-0ebf638528ae/scratchpad';
const browser = await chromium.launch();

const walkAndCheck = async (page, url, prefix, shots) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  let h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 600) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(180);
    h = await page.evaluate(() => document.documentElement.scrollHeight);
  }
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const bad = [];
    if (doc.scrollWidth > doc.clientWidth + 1) {
      document.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > doc.clientWidth + 8 && r.width > 24 && getComputedStyle(el).position !== 'fixed') {
          bad.push(`${el.tagName}.${String(el.className).slice(0, 60)} right=${Math.round(r.right)}`);
        }
      });
    }
    return { scrollW: doc.scrollWidth, clientW: doc.clientWidth, bad: bad.slice(0, 8) };
  });
  console.log(`${prefix}: scrollW=${overflow.scrollW} clientW=${overflow.clientW} hOverflow=${overflow.scrollW > overflow.clientW + 1}`);
  overflow.bad.forEach((b) => console.log(`  OVERFLOW ${b}`));
  for (const [sel, name, off] of shots) {
    const top = await page.evaluate((s) => {
      const el = document.querySelector(s);
      return el ? el.getBoundingClientRect().top + window.scrollY : -1;
    }, sel);
    if (top < 0) { console.log(`  MISSING ${sel}`); continue; }
    await page.evaluate((yy) => window.scrollTo(0, yy), Math.max(0, top + (off ?? -80)));
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${dir}/${prefix}-${name}.png` });
  }
  console.log(`${prefix} errors:`, errors.length ? errors.join(' | ') : 'none');
};

// Desktop: new about page
const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await walkAndCheck(desk, 'http://localhost:3000/v2/about-me', 'd-about', [
  ['body', 'hero', 0],
  ['#v2a-profile', 'sheet', 150],
  ['#v2a-experience', 'exp', 100],
  ['#v2a-skills', 'skills', 100],
]);
await desk.close();

// Android: both pages
const ctx = await browser.newContext({ ...devices['Pixel 7'] });
const mob = await ctx.newPage();
await walkAndCheck(mob, 'http://localhost:3000/v2', 'm-home', [
  ['body', 'hero', 0],
  ['#v2-snapshot', 'snapshot', -40],
  ['#v2-showcase', 'deck', 300],
  ['#v2-projects', 'projects', 200],
]);
await walkAndCheck(mob, 'http://localhost:3000/v2/about-me', 'm-about', [
  ['body', 'hero', 0],
  ['#v2a-profile', 'sheet', 150],
  ['#v2a-skills', 'skills', 150],
]);
await ctx.close();
await browser.close();
