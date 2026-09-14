import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';

async function run() {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const shots = [];

  async function snap(name) {
    const path = `e2e/screenshots/${name}.png`;
    await page.screenshot({ path, fullPage: false });
    shots.push(path);
    console.log(`📸 ${name}`);
  }

  async function waitSplash() {
    await page.waitForTimeout(3000);
    // Force-dismiss splash if still blocking
    await page.evaluate(() => {
      const s = document.getElementById('splash');
      if (s) { s.style.display = 'none'; s.style.pointerEvents = 'none'; }
    });
    await page.waitForTimeout(300);
  }

  // 1. Homepage
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await waitSplash();
  await snap('01-homepage');

  // 2. Scroll to corners section
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(500);
  await snap('02-homepage-corners');

  // 3. Scroll to new writing section
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(500);
  await snap('03-homepage-writing');

  // 4. Click first article
  await page.evaluate(() => { document.getElementById('splash')?.remove(); });
  const firstArticle = await page.$('a[href^="/articles/"]');
  if (firstArticle) {
    await firstArticle.click({ timeout: 5000 }).catch(() => {
      return page.evaluate(() => {
        const a = document.querySelector('a[href^="/articles/"]');
        if (a) window.location.href = a.getAttribute('href');
      });
    });
    await page.waitForTimeout(2000);
    await snap('04-article-page');
  }

  // 5. Scroll down article
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(500);
  await snap('05-article-content');

  // 6. Dark mode toggle
  await page.evaluate(() => {
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.click();
  });
  await page.waitForTimeout(700);
  await snap('06-dark-mode-article');

  // 7. Homepage in dark mode
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await waitSplash();
  await snap('07-homepage-dark');

  // 8. Sign-in page
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await snap('08-sign-in');

  // 9. Settings page
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await snap('09-settings');

  // 10. Vocabulary page
  await page.goto(`${BASE}/english/vocabulary`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await snap('10-vocabulary');

  // 11. Mobile - homepage
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await waitSplash();
  await snap('11-mobile-homepage');

  // 12. Mobile scroll
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(500);
  await snap('12-mobile-scroll');

  // 13. Mobile hamburger
  await page.evaluate(() => {
    const btn = document.querySelector('.nav-toggle');
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);
  await snap('13-mobile-hamburger');

  // Close hamburger
  await page.evaluate(() => {
    const nav = document.querySelector('.primary-nav');
    if (nav) nav.removeAttribute('data-open');
  });
  await page.waitForTimeout(300);

  // 14. Tablet view
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await waitSplash();
  await snap('14-tablet-homepage');

  // 15. Search page
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/search`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await snap('15-search');

  // 16. Corners page
  await page.goto(`${BASE}/corners`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await snap('16-corners');

  // 17. Archive page
  await page.goto(`${BASE}/archive`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await snap('17-archive');

  // 18. Paths page
  await page.goto(`${BASE}/paths`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await snap('18-paths');

  // 19. About page
  await page.goto(`${BASE}/about`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await snap('19-about');

  // 20. Highlighter test
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await waitSplash();
  await page.evaluate(() => {
    const a = document.querySelector('a[href^="/articles/"]');
    if (a) window.location.href = a.getAttribute('href');
  });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { document.getElementById('splash')?.remove(); });
  await page.evaluate(() => {
    const el = document.querySelector('.article-body');
    if (!el) return;
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let n;
    while ((n = walk.nextNode())) nodes.push(n);
    if (nodes.length > 2) {
      const range = document.createRange();
      range.setStart(nodes[1], 0);
      range.setEnd(nodes[2], Math.min(30, nodes[2].length));
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      el.dispatchEvent(new Event('mouseup', { bubbles: true }));
    }
  });
  await page.waitForTimeout(700);
  await snap('20-highlighter-popover');

  // 21. Appearance panel (Aa icon)
  await page.evaluate(() => {
    const btn = document.querySelector('.icon-btn[aria-label*="appear"], .icon-btn[aria-label*="text"], .icon-btn[aria-label*="setting"]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);
  await snap('21-appearance-panel');

  // 22. Article with scroll for TOC
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(500);
  await snap('22-article-toc-scroll');

  console.log(`\n✅ Done! ${shots.length} screenshots saved to e2e/screenshots/`);
  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
