import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';

async function run() {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Set localStorage to simulate repeat visit
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await page.evaluate(() => localStorage.setItem('hume-visited', '1'));

  // Reload to trigger quote loader
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'e2e/screenshots/quote-new-1.png' });
  console.log('📸 1 - quote visible');

  // Dark mode version
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'e2e/screenshots/quote-new-dark.png' });
  console.log('📸 2 - dark mode');

  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
