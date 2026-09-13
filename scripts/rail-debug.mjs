import { chromium } from "@playwright/test";

const b = await chromium.launch();
const p = await b.newPage();
await p.goto("http://localhost:3000/articles/reading-your-way-to-better-english");
await p.waitForTimeout(2000);
const rail = await p.locator("aside[aria-labelledby='words-to-notice']").count();
console.log("rail count:", rail);
if (rail) {
  console.log("rail text:", (await p.locator("aside[aria-labelledby='words-to-notice']").innerText()).slice(0, 200));
}
await b.close();
