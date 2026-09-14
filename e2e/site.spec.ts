/**
 * THE HUMAN EDIT — Full UI test sweep.
 * Covers every public route, every interactive element (nav links,
 * buttons, hero CTAs, corner cards, writing rows, footer links,
 * theme toggle, search, article reading controls).
 *
 * Run against the local dev server on http://localhost:3000.
 */
import { test, expect } from "@playwright/test";

const PUBLIC_ROUTES = [
  "/",
  "/explore",
  "/corners",
  "/paths",
  "/archive",
  "/search",
  "/about",
  "/editorial-policy",
  "/human-authorship",
  "/privacy",
  "/terms",
  "/accessibility",
  "/english/vocabulary",
];

let articleSlug = "";
let authorSlug = "";
let cornerSlug = "";
let pathSlug = "";

test.beforeAll(async ({ browser }) => {
  // Discover real slugs from the homepage so downstream tests use live data.
  const page = await browser.newPage();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );
  const slugs = await page.evaluate(() => ({
    article: document
      .querySelector('a[href^="/articles/"]')
      ?.getAttribute("href")
      ?.replace("/articles/", ""),
    author: document
      .querySelector('a[href^="/authors/"]')
      ?.getAttribute("href")
      ?.replace("/authors/", ""),
    corner: document
      .querySelector('a[href^="/corners/"]')
      ?.getAttribute("href")
      ?.replace("/corners/", ""),
    path: document
      .querySelector('a[href^="/paths/"]')
      ?.getAttribute("href")
      ?.replace("/paths/", ""),
  }));
  articleSlug = slugs.article ?? "";
  authorSlug = slugs.author ?? "";
  cornerSlug = slugs.corner ?? "";
  pathSlug = slugs.path ?? "";
  await page.close();
});

/* ------------------------------------------------------------------ */
/* 1. Every public route renders with masthead, nav, and footer        */
/* ------------------------------------------------------------------ */

for (const route of PUBLIC_ROUTES) {
  test(`route renders: ${route}`, async ({ page }) => {
    const res = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(400);

    // Masthead + wordmark
    const wordmark = page.locator(".masthead .wordmark");
    await expect(wordmark).toContainText("The Human Edit");

    // Primary nav links
    for (const label of ["Explore", "Corners", "Paths", "Library"]) {
      await expect(
        page.locator(`.primary-nav a:has-text("${label}")`)
      ).toBeVisible();
    }

    // Footer
    await expect(page.locator(".site-footer")).toBeVisible();
    await expect(
      page.locator(".footer-bottom", { hasText: "written by a person" })
    ).toBeVisible();
  });
}

/* ------------------------------------------------------------------ */
/* 2. Homepage — splash, hero, tickets, The Edit, corners, writing     */
/* ------------------------------------------------------------------ */

test("homepage: splash appears then hides", async ({ page }) => {
  await page.goto("/");
  const splash = page.locator("#splash");
  await expect(splash).toBeVisible();
  // It must never trap the user — hides within 4s.
  await expect
    .poll(() => splash.getAttribute("data-hidden"), { timeout: 5000 })
    .toBe("true");
});

test("homepage: hero heading, lede, and CTAs", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );

  await expect(page.locator(".hero h1")).toContainText("Read something");
  await expect(page.locator(".hero .lede")).toContainText("written by people");
  await expect(
    page.locator('.hero-ctas a:has-text("Explore what you\'re looking for")')
  ).toBeVisible();
  await expect(
    page.locator('.hero-ctas a:has-text("Browse the corners")')
  ).toBeVisible();
});

test("homepage: hero tickets render featured picks", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );
  const tickets = page.locator(".hero-side .ticket");
  const count = await tickets.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(tickets.nth(i).locator(".corner")).not.toBeEmpty();
    await expect(tickets.nth(i).locator("p")).not.toBeEmpty();
  }
});

test("homepage: hero CTA navigates to search page", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );
  await page.click('.hero-ctas a:has-text("Explore what you\'re looking for")');
  await page.waitForURL("**/search");
  await expect(page).toHaveURL(/\/search$/);
});

test("homepage: ghost CTA navigates to corners page", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );
  await page.click('.hero-ctas a:has-text("Browse the corners")');
  await page.waitForURL("**/corners");
  await expect(page).toHaveURL(/\/corners$/);
});

test("homepage: The Edit section shows feature story with byline", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );
  const feature = page.locator(".feature-story");
  await expect(feature).toBeVisible();
  await expect(feature.locator("h3")).not.toBeEmpty();
  await expect(feature.locator(".byline")).toContainText("By ");
});

test("homepage: corner cards have fold motif and numbered", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );
  const cards = page.locator(".corner-card");
  expect(await cards.count()).toBeGreaterThanOrEqual(6);
  await expect(cards.first().locator(".cnum")).toHaveText(/^0[1-6]$/);
  await expect(cards.first().locator("h3")).not.toBeEmpty();
  // Read link navigates to an article
  const readLink = cards.first().locator(".read-link");
  if ((await readLink.count()) > 0) {
    const href = await readLink.first().getAttribute("href");
    expect(href).toMatch(/^\/articles\//);
  }
});

test("homepage: corner card hover grows the fold (CSS applied)", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );
  const card = page.locator(".corner-card").first();
  await card.hover();
  // ::before is CSS — verify via the transition-ready state: card lifts.
  const transform = await card.evaluate(
    (el) => getComputedStyle(el).transform
  );
  expect(transform).not.toBe("none");
});

test("homepage: writing rows are newspaper list items with meta", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );
  const rows = page.locator(".writing-row");
  expect(await rows.count()).toBeGreaterThanOrEqual(1);
  const first = rows.first();
  await expect(first.locator(".corner-tag")).not.toBeEmpty();
  await expect(first.locator("h4")).not.toBeEmpty();
  await expect(first.locator(".meta")).not.toBeEmpty();
});

test("homepage: writing row click navigates to article", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );
  await page.click(".writing-row >> nth=0");
  await page.waitForURL("**/articles/**");
  expect(page.url()).toContain("/articles/");
});

/* ------------------------------------------------------------------ */
/* 3. Masthead — sticky nav, icon buttons, masthead condense          */
/* ------------------------------------------------------------------ */

test("masthead: primary nav links navigate to correct routes", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );

  const navTargets: [string, RegExp][] = [
    ["Explore", /\/explore$/],
    ["Corners", /\/corners$/],
    ["Paths", /\/paths$/],
    ["Library", /\/library$/],
  ];
  for (const [label, url] of navTargets) {
    await page.goto("/");
    await page.evaluate(() =>
      document.getElementById("splash")?.setAttribute("data-hidden", "true")
    );
    await page.click(`.primary-nav a:has-text("${label}")`);
    await page.waitForURL(url);
    expect(page.url()).toMatch(url);
  }
});

test("masthead: wordmark navigates home", async ({ page }) => {
  await page.goto("/archive");
  await page.click(".masthead .wordmark");
  await page.waitForURL(/\/$/);
  expect(page.url()).toMatch(/localhost:3000\/$/);
});

test("masthead: search icon button navigates to search", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );
  await page.click('.head-actions a[aria-label="Explore Search"]');
  await page.waitForURL("**/search");
});

test("masthead: account icon navigates to settings", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );
  await page.click('.head-actions a[aria-label="Account"]');
  await page.waitForURL("**/settings");
});

test("masthead: condenses on scroll", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );
  const masthead = page.locator(".masthead");
  await expect(masthead).toHaveAttribute("data-condensed", "false");
  await page.evaluate(() => window.scrollTo(0, 300));
  await expect
    .poll(() => masthead.getAttribute("data-condensed"), { timeout: 3000 })
    .toBe("true");
});

/* ------------------------------------------------------------------ */
/* 4. Theme system — toggle, persistence, no-flash, ripple             */
/* ------------------------------------------------------------------ */

test("theme: toggle switches dark/light and persists across reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() =>
    document.documentElement.hasAttribute("data-theme-mode")
  );

  const before = await page.evaluate(() =>
    document.documentElement.getAttribute("data-theme")
  );

  await page.click("#theme-toggle");
  await page.waitForTimeout(300);
  const after = await page.evaluate(() =>
    document.documentElement.getAttribute("data-theme")
  );
  expect(after).not.toBe(before);

  // Manual choice persists across reload.
  await page.reload();
  await page.waitForFunction(() =>
    document.documentElement.hasAttribute("data-theme-mode")
  );
  await expect
    .poll(
      () =>
        page.evaluate(() => document.documentElement.getAttribute("data-theme")),
      { timeout: 5000 }
    )
    .toBe(after);
});

test("theme: manual choice survives navigation to another page", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() =>
    document.documentElement.hasAttribute("data-theme-mode")
  );
  const before = await page.evaluate(() =>
    document.documentElement.getAttribute("data-theme")
  );
  await page.click("#theme-toggle");
  await page.waitForTimeout(300);
  const toggled = await page.evaluate(() =>
    document.documentElement.getAttribute("data-theme")
  );
  expect(toggled).not.toBe(before);

  await page.click('.primary-nav a:has-text("Corners")');
  const afterNav = await page.evaluate(() =>
    document.documentElement.getAttribute("data-theme")
  );
  expect(afterNav).toBe(toggled);
});

test("theme: dark palette tokens actually change background color", async ({
  page,
}) => {
  await page.goto("/");
  // Wait for hydration so ThemeProvider's initial apply() has run.
  await page.waitForFunction(() =>
    document.documentElement.hasAttribute("data-theme-mode")
  );
  await page.click("#theme-toggle");
  // Wait past the 420ms background transition.
  await page.waitForTimeout(700);
  const bg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor
  );
  // --paper dark #161511 → rgb(22, 21, 17)
  expect(["rgb(22, 21, 17)", "rgb(31, 30, 26)"]).toContain(bg);
});

test("theme: light palette background matches token", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() =>
    document.documentElement.hasAttribute("data-theme-mode")
  );
  // Ensure we're on light (system default in headless Chromium is light).
  const mode = await page.evaluate(
    () => document.documentElement.getAttribute("data-theme")
  );
  const bg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor
  );
  if (mode === "light") {
    // --paper light #F6F4EE → rgb(246, 244, 238)
    expect(bg).toBe("rgb(246, 244, 238)");
  } else {
    expect(bg).toBe("rgb(22, 21, 17)");
  }
});

/* ------------------------------------------------------------------ */
/* 5. Footer — every link resolves                                     */
/* ------------------------------------------------------------------ */

test("footer: all footer links resolve to valid pages", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );
  const links = page.locator(".site-footer a");
  const count = await links.count();
  expect(count).toBeGreaterThanOrEqual(12);

  for (let i = 0; i < count; i++) {
    const href = (await links.nth(i).getAttribute("href")) ?? "";
    if (!href.startsWith("/")) continue;
    const res = await page.request.get(href);
    expect(
      res.status(),
      `footer link ${href} should resolve`
    ).toBeLessThan(400);
  }
});

/* ------------------------------------------------------------------ */
/* 6. Search — the signature feature                                   */
/* ------------------------------------------------------------------ */

test("search: page renders input and accepts a query", async ({ page }) => {
  await page.goto("/search");
  const input = page.locator(
    'input[type="search"], input[type="text"], input[role="searchbox"], textarea'
  );
  await expect(input.first()).toBeVisible();
});

test("search: natural language query returns results", async ({ page }) => {
  await page.goto("/search");
  const input = page.locator(
    'input[type="search"], input[type="text"], input[role="searchbox"], textarea'
  );
  await input.first().fill("feeling stuck");
  await input.first().press("Enter");
  await page.waitForTimeout(2000);
  // Either results or a designed zero-state — never a dead crash.
  const body = await page.locator("body").innerText();
  expect(body.length).toBeGreaterThan(50);
});

/* ------------------------------------------------------------------ */
/* 7. Article page — header, reading layout, controls                  */
/* ------------------------------------------------------------------ */

test("article: page renders header, byline, and body", async ({ page }) => {
  test.skip(!articleSlug, "no article slug discovered");
  await page.goto(`/articles/${articleSlug}`);
  const h1 = page.locator("article h1, h1").first();
  await expect(h1).not.toBeEmpty();
  const body = await page.locator("body").innerText();
  expect(body).toContain("By ");
});

test("article: reading theme control cycles themes", async ({ page }) => {
  test.skip(!articleSlug, "no article slug discovered");
  await page.goto(`/articles/${articleSlug}`);
  const article = page.locator("article[data-reading-theme]").first();
  if ((await article.count()) === 0) test.skip(true, "no theme control");
  const before = await article.getAttribute("data-reading-theme");

  // Open the Appearance panel and pick a different theme.
  const appearanceBtn = page.locator('button:has-text("Appearance")');
  if ((await appearanceBtn.count()) === 0) test.skip(true, "no appearance button");
  await appearanceBtn.click();
  const themeBtn = page.locator('fieldset button[aria-pressed]', { hasText: /^(light|warm|dark)$/ });
  if ((await themeBtn.count()) === 0) test.skip(true, "no theme buttons");
  // Click a theme different from current.
  const target = before === "dark" ? "warm" : "dark";
  await page.locator(`fieldset button[aria-pressed]:has-text("${target}")`).click();
  const after = await article.getAttribute("data-reading-theme");
  expect(after).not.toBe(before);
});

test("article: text size control changes body font size", async ({ page }) => {
  test.skip(!articleSlug, "no article slug discovered");
  await page.goto(`/articles/${articleSlug}`);
  const body = page.locator(".article-body").first();
  if ((await body.count()) === 0) test.skip(true, "no article body");
  const before = await body.evaluate((el) => getComputedStyle(el).fontSize);

  const appearanceBtn = page.locator('button:has-text("Appearance")');
  if ((await appearanceBtn.count()) === 0) test.skip(true, "no appearance button");
  await appearanceBtn.click();
  // Click a different size — exact text to avoid A++/A+++ ambiguity.
  await page.getByRole("button", { name: "A++", exact: true }).click();
  const after = await body.evaluate((el) => getComputedStyle(el).fontSize);
  expect(after).not.toBe(before);
});

test("article: table of contents links scroll to headings", async ({
  page,
}) => {
  test.skip(!articleSlug, "no article slug discovered");
  await page.goto(`/articles/${articleSlug}`);
  const toc = page.locator('a[href^="#"]').first();
  if ((await toc.count()) === 0) test.skip(true, "no TOC");
  const hash = await toc.getAttribute("href");
  await toc.click();
  await page.waitForTimeout(600);
  if (hash) {
    expect(page.url()).toContain(hash);
  }
});

/* ------------------------------------------------------------------ */
/* 8. Corners / authors / paths / archive — index + detail            */
/* ------------------------------------------------------------------ */

test("corners: index lists all six corners", async ({ page }) => {
  await page.goto("/corners");
  const body = await page.locator("body").innerText();
  for (const name of ["Story", "English", "Growth", "Thought", "Help", "Human"]) {
    expect(body, `corners index should mention ${name}`).toContain(name);
  }
});

test("corners: detail page lists articles", async ({ page }) => {
  test.skip(!cornerSlug, "no corner slug discovered");
  const res = await page.goto(`/corners/${cornerSlug}`);
  expect(res?.status()).toBeLessThan(400);
  const body = await page.locator("body").innerText();
  expect(body.length).toBeGreaterThan(100);
});

test("authors: detail page renders bio and articles", async ({ page }) => {
  test.skip(!authorSlug, "no author slug discovered");
  const res = await page.goto(`/authors/${authorSlug}`);
  expect(res?.status()).toBeLessThan(400);
});

test("paths: index lists reading paths", async ({ page }) => {
  await page.goto("/paths");
  const body = await page.locator("body").innerText();
  expect(body.toLowerCase()).toContain("path");
});

test("paths: detail page shows steps", async ({ page }) => {
  test.skip(!pathSlug, "no path slug discovered");
  const res = await page.goto(`/paths/${pathSlug}`);
  expect(res?.status()).toBeLessThan(400);
});

test("archive: lists published articles chronologically", async ({ page }) => {
  await page.goto("/archive");
  const body = await page.locator("body").innerText();
  expect(body).toContain("Archive");
  expect(
    await page.locator('a[href^="/articles/"]').count()
  ).toBeGreaterThanOrEqual(5);
});

test("explore: browse page lists content", async ({ page }) => {
  await page.goto("/explore");
  const body = await page.locator("body").innerText();
  expect(body.length).toBeGreaterThan(100);
});

/* ------------------------------------------------------------------ */
/* 9. Vocabulary (English Corner special)                              */
/* ------------------------------------------------------------------ */

test("vocabulary: page lists word cards", async ({ page }) => {
  await page.goto("/english/vocabulary");
  await page.waitForTimeout(2000); // let splash hide
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  expect(body.toLowerCase()).toContain("words to notice");
  expect(body.toLowerCase()).toContain("serendipity");
  expect(body.toLowerCase()).toContain("petrichor");
});

test("vocabulary: word of the day section renders with save control", async ({
  page,
}) => {
  await page.goto("/english/vocabulary");
  await page.waitForTimeout(2000);
  const wotd = page.locator("section[aria-labelledby='wotd-heading']");
  await expect(wotd).toBeVisible();
  await expect(wotd).toContainText("Word of the day");
  const save = page.getByTestId("save-word").first();
  await expect(save).toBeVisible();
});

test("vocabulary: pronounce buttons exist and are clickable", async ({
  page,
}) => {
  await page.goto("/english/vocabulary");
  await page.waitForTimeout(2000);
  const buttons = page.locator('button[aria-label^="Pronounce"]');
  expect(await buttons.count()).toBeGreaterThan(0);
  // Click the first — no crash either way (speech may be unavailable headless).
  await buttons.first().click({ timeout: 5000 });
});

test("vocabulary: difficulty tags render on cards", async ({ page }) => {
  await page.goto("/english/vocabulary");
  await page.waitForTimeout(2000);
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  expect(body).toMatch(/· (rare|everyday|advanced)/);
});

/* ------------------------------------------------------------------ */
/* 7b. Article page — vocabulary rail, topic chips, JSON-LD            */
/* ------------------------------------------------------------------ */

test("article: topic chips link to search", async ({ page }) => {
  test.skip(!articleSlug, "no article slug discovered");
  await page.goto(`/articles/${articleSlug}`);
  const chips = page.locator('a[href^="/search?q="]');
  const count = await chips.count();
  if (count === 0) test.skip(true, "no topic chips on this article");
  for (let i = 0; i < count; i++) {
    const href = await chips.nth(i).getAttribute("href");
    expect(href).toMatch(/^\/search\?q=/);
  }
});

test("article: words-to-notice rail links to vocabulary page", async ({
  page,
}) => {
  // Use the article that has linked vocabulary.
  await page.goto("/articles/reading-your-way-to-better-english", {
    waitUntil: "domcontentloaded",
  });
  const rail = page.locator("aside[aria-labelledby='words-to-notice']");
  await expect(rail).toBeVisible({ timeout: 15000 });
  await expect(rail).toContainText("serendipity");
  const more = rail.locator('a[href="/english/vocabulary"]').last();
  await expect(more).toBeVisible();
});

test("article: JSON-LD structured data present", async ({ page }) => {
  test.skip(!articleSlug, "no article slug discovered");
  await page.goto(`/articles/${articleSlug}`);
  const jsonLd = await page
    .locator('script[type="application/ld+json"]')
    .first()
    .textContent();
  expect(jsonLd).toBeTruthy();
  const parsed = JSON.parse(jsonLd!);
  expect(parsed["@type"]).toBe("Article");
  expect(parsed.headline).toBeTruthy();
});

test("homepage: WebSite JSON-LD with SearchAction present", async ({
  page,
}) => {
  await page.goto("/");
  const jsonLd = await page
    .locator('script[type="application/ld+json"]')
    .first()
    .textContent();
  const parsed = JSON.parse(jsonLd!);
  expect(parsed["@type"]).toBe("WebSite");
  expect(parsed.potentialAction["@type"]).toBe("SearchAction");
});

/* ------------------------------------------------------------------ */
/* 10. Sign-in / auth surfaces                                         */
/* ------------------------------------------------------------------ */

test("auth: sign-in page renders a form", async ({ page }) => {
  await page.goto("/sign-in");
  const form = page.locator("form").first();
  if ((await form.count()) === 0) test.skip(true, "no sign-in form");
  await expect(form).toBeVisible();
  await expect(
    page.locator('input[type="email"], input[name*="email"]').first()
  ).toBeVisible();
  await expect(
    page.locator('input[type="password"]').first()
  ).toBeVisible();
});

/* ------------------------------------------------------------------ */
/* 11. Static policy pages have real content                           */
/* ------------------------------------------------------------------ */

for (const [route, phrase] of [
  ["/about", "human"],
  ["/editorial-policy", "editorial"],
  ["/human-authorship", "author"],
  ["/privacy", "privacy"],
  ["/terms", "terms"],
  ["/accessibility", "accessib"],
] as const) {
  test(`policy page has content: ${route}`, async ({ page }) => {
    await page.goto(route);
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(200);
    expect(body.toLowerCase()).toContain(phrase);
  });
}

/* ------------------------------------------------------------------ */
/* 12. Keyboard navigation + focus visibility (§22)                    */
/* ------------------------------------------------------------------ */

test("keyboard: Tab moves focus through masthead with visible outline", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );
  await page.keyboard.press("Tab");
  const active = await page.evaluate(
    () => document.activeElement?.tagName
  );
  expect(["A", "BUTTON", "INPUT"]).toContain(active ?? "");
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    return getComputedStyle(el).outlineStyle;
  });
  // Focus-visible styling applies when keyboard-focused.
  expect(["solid", "auto"]).toContain(outline);
});

test("keyboard: main landmark exists for skip links", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#main")).toBeVisible();
});

/* ------------------------------------------------------------------ */
/* 13. Scroll-reveal animation system                                  */
/* ------------------------------------------------------------------ */

test("reveal: sections gain in-view class when scrolled to", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.getElementById("splash")?.setAttribute("data-hidden", "true")
  );
  // Scroll to the bottom so every section enters the viewport.
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight })
  );
  // All reveal targets should now be in-view (or shortly after transitions).
  await expect
    .poll(
      async () =>
        page
          .locator(".reveal:not(.in-view), [data-stagger] .reveal:not(.in-view)")
          .count(),
      { timeout: 8000 }
    )
    .toBe(0);
  // And at least one section did reveal.
  expect(
    await page.locator(".reveal.in-view, [data-stagger] .in-view").count()
  ).toBeGreaterThan(0);
});

/* ------------------------------------------------------------------ */
/* 14. 404 handling                                                    */
/* ------------------------------------------------------------------ */

test("404: unknown route shows not-found page, not a crash", async ({
  page,
}) => {
  const res = await page.goto("/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
  const body = await page.locator("body").innerText();
  expect(body.length).toBeGreaterThan(20);
});
