/**
 * Headed Chromium visual sweep — opens a real browser window and walks
 * every key page, toggling theme, exercising controls, taking screenshots.
 * Verifies visually what the e2e suite verified programmatically.
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "screenshots";
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ headless: false });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();

const pages = [
  ["/", "home"],
  ["/articles/reading-your-way-to-better-english", "article"],
  ["/english/vocabulary", "vocabulary"],
  ["/corners", "corners"],
  ["/corners/english", "corner-english"],
  ["/search", "search"],
  ["/paths", "paths"],
  ["/paths/feeling-stuck", "path-detail"],
  ["/archive", "archive"],
  ["/authors", "authors"],
  ["/authors/amara-sen", "author"],
  ["/explore", "explore"],
  ["/library", "library"],
  ["/settings", "settings"],
  ["/about", "about"],
  ["/english/vocabulary", "vocab-dark"], // re-shot in dark below
];

for (const [route, name] of pages) {
  await p.goto(BASE + route, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1800);
  if (route === "/") {
    // Let splash lift and hero animate.
    await p.waitForTimeout(1600);
    await p.evaluate(() => window.scrollTo(0, 900));
    await p.waitForTimeout(900);
  }
  if (name === "vocab-dark") {
    await p.evaluate(() => {
      localStorage.setItem("hume-theme", "dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await p.waitForTimeout(600);
  }
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log(`shot: ${name}`);
}

// Exercise interactions on the article page.
await p.goto(BASE + "/articles/reading-your-way-to-better-english", {
  waitUntil: "domcontentloaded",
});
await p.waitForTimeout(2000);
await p.evaluate(() => {
  localStorage.setItem("hume-theme", "light");
  document.documentElement.setAttribute("data-theme", "light");
});

// Appearance panel open
await p.click('button:has-text("Appearance")');
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/article-appearance-open.png` });
await p.click('button:has-text("Appearance")').catch(() => {});

// Theme toggle click (ripple + dark)
await p.click("#theme-toggle");
await p.waitForTimeout(700);
await p.screenshot({ path: `${OUT}/article-dark-toggle.png` });
await p.click("#theme-toggle");
await p.waitForTimeout(500);

console.log("visual sweep done");
await b.close();
