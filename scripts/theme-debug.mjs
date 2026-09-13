import { chromium } from "@playwright/test";

const b = await chromium.launch();
const p = await b.newPage();
await p.goto("http://localhost:3000");
await p.waitForFunction(() => document.documentElement.hasAttribute("data-theme-mode"));
console.log("mode attr:", await p.evaluate(() => document.documentElement.getAttribute("data-theme-mode")));
console.log("stored:", await p.evaluate(() => localStorage.getItem("hume-theme")));

// Click the actual toggle button like a user would.
await p.click("#theme-toggle");
await p.waitForTimeout(300);
console.log("after click attr:", await p.evaluate(() => document.documentElement.getAttribute("data-theme")));
console.log("after click stored:", await p.evaluate(() => localStorage.getItem("hume-theme")));
console.log("after click bg:", await p.evaluate(() => getComputedStyle(document.body).backgroundColor));

// Set dark directly AFTER hydration + click cycle.
await p.evaluate(() => {
  localStorage.setItem("hume-theme", "dark");
  document.documentElement.setAttribute("data-theme", "dark");
});
await p.waitForTimeout(300);
console.log("manual dark bg:", await p.evaluate(() => getComputedStyle(document.body).backgroundColor));
await b.close();
