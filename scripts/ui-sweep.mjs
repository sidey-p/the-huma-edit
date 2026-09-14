/**
 * UI diagnostic sweep: dark-mode contrast, theme toggle reliability,
 * popovers, hero links, chips, dek lengths, overlaps.
 * Headless. http://localhost:3000
 */
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const issues = [];
const ok = (m) => console.log("  OK :", m);
const bad = (m) => { console.log("  !! :", m); issues.push(m); };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); // phone
const p = await ctx.newPage();

// ---------- 1. splash once, then spinner ----------
console.log("\n[1] Splash/spinner logic");
await p.goto(BASE, { waitUntil: "domcontentloaded" });
await p.evaluate(() => localStorage.clear());
await p.reload();
const splash1 = await p.locator("#splash").count();
ok(`first visit splash shown: ${splash1 > 0}`);
await p.waitForTimeout(2200);
await p.reload();
const splash2 = await p.locator("#splash").count();
const spinner2 = await p.locator("#quote-loader").count();
ok(`repeat visit no splash: ${splash2 === 0}, spinner: ${spinner2 > 0}`);
await p.waitForTimeout(1500);
// article page: no splash at all
await p.goto(BASE + "/articles/feeling-stuck-going-nowhere", { waitUntil: "domcontentloaded" });
const splashArt = await p.locator("#splash").count();
const spinnerArt = await p.locator("#quote-loader").count();
splashArt === 0 && spinnerArt === 0
  ? ok("article page: instant, no overlay")
  : bad("article page shows splash/spinner overlay");

// ---------- 2. hamburger on phone only ----------
console.log("\n[2] Hamburger visibility");
const burgerVisiblePhone = await p.locator(".nav-toggle").isVisible();
burgerVisiblePhone ? ok("hamburger visible on phone") : bad("hamburger missing on phone");
const d = await b.newContext({ viewport: { width: 1440, height: 900 } });
const dp = await d.newPage();
await dp.goto(BASE, { waitUntil: "domcontentloaded" });
const burgerBig = await dp.locator(".nav-toggle").isVisible();
!burgerBig ? ok("hamburger hidden on desktop") : bad("hamburger shows on desktop");

// menu open/close + tap outside
await p.goto(BASE, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2400);
await p.locator(".nav-toggle").click();
const menuOpen = await p.locator('.primary-nav[data-open="true"]').count();
menuOpen > 0 ? ok("menu opens") : bad("menu does not open");
await p.locator("h1").first().click({ force: true }); // tap outside
await p.waitForTimeout(300);
const menuStill = await p.locator('.primary-nav[data-open="true"]').count();
menuStill === 0 ? ok("menu closes on outside tap") : bad("menu does not close on outside tap");

// ---------- 3. hero highlights open ----------
console.log("\n[3] Hero highlight tickets");
for (const slug of ["habits-that-survive-bad-weeks", "feeling-stuck-going-nowhere", "how-to-make-a-big-decision"]) {
  const r = await p.request.get(BASE + "/articles/" + slug);
  r.status() === 200 ? ok(`/articles/${slug} opens`) : bad(`/articles/${slug} -> ${r.status()}`);
}

// ---------- 4. corner cards + Read link ----------
console.log("\n[4] Corner cards");
await dp.goto(BASE, { waitUntil: "domcontentloaded" });
await dp.waitForTimeout(2500);
const readLinks = await dp.locator(".corner-card .read-link").count();
readLinks >= 6 ? ok(`read links present (${readLinks})`) : bad(`read links missing (${readLinks}/6)`);
const g = await dp.locator(".corner-card .read-link").first().getAttribute("href");
g?.startsWith("/articles/") ? ok("Read link targets article") : bad("Read link target wrong: " + g);

// ---------- 5. topic chips ----------
console.log("\n[5] Topic chips -> related articles");
await dp.goto(BASE + "/articles/habits-that-survive-bad-weeks", { waitUntil: "domcontentloaded" });
const chip = dp.locator(".chip").first();
const href = await chip.getAttribute("href");
href?.startsWith("/topics/") ? ok("chip -> topic page: " + href) : bad("chip href: " + href);
await chip.click();
await dp.waitForLoadState("domcontentloaded");
const cards = await dp.locator("article .group").count();
cards > 0 ? ok(`topic page lists ${cards} articles`) : bad("topic page has no articles");

// ---------- 6. theme toggle reliability ----------
console.log("\n[6] Theme toggle x6");
await dp.goto(BASE, { waitUntil: "domcontentloaded" });
await dp.evaluate(() => localStorage.removeItem("hume-theme"));
await dp.waitForTimeout(2500);
for (let i = 0; i < 6; i++) {
  await dp.locator(".theme-toggle").click();
  await dp.waitForTimeout(350);
  const t = await dp.evaluate(() => document.documentElement.getAttribute("data-theme"));
  const stored = await dp.evaluate(() => localStorage.getItem("hume-theme"));
  if (t !== stored) bad(`toggle ${i}: attr=${t} stored=${stored}`);
  const bg = await dp.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const ink = await dp.evaluate(() => getComputedStyle(document.body).color);
  const lum = (c) => { const m = c.match(/\d+/g).map(Number); return (0.299*m[0]+0.587*m[1]+0.114*m[2])/255; };
  const bgL = lum(bg), inkL = lum(ink);
  if (Math.abs(bgL - inkL) < 0.2) bad(`toggle ${i}: bg ${bg} vs ink ${ink} (low contrast)`);
}
ok("6 toggles, attr==storage, body contrast checked");
// dark stays dark after reload
await dp.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
await dp.reload();
await dp.waitForTimeout(2000);
const afterReload = await dp.evaluate(() => document.documentElement.getAttribute("data-theme"));
afterReload === "dark" ? ok("theme persists dark after reload") : bad("theme lost after reload: " + afterReload);

// ---------- 7. dark-mode white-on-white scan ----------
console.log("\n[7] Dark contrast scan (key pages)");
async function contrastScan(page, route, name) {
  await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
  const res = await page.evaluate(() => {
    const out = [];
    const lum = (c) => { const m = c.match(/\d+(\.\d+)?/g)?.map(Number); if (!m || m.length < 3) return null; return (0.299*m[0]+0.587*m[1]+0.114*m[2])/255; };
    const els = document.querySelectorAll("h1,h2,h3,h4,p,a,button,span,li,time,label,textarea,input");
    for (const el of els) {
      if (!el.textContent?.trim() || el.children.length > 0 && el.tagName !== "A" && el.tagName !== "BUTTON") continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.1) continue;
      const ink = lum(cs.color); if (ink === null) continue;
      let node = el, bg = null, guard = 0;
      while (node && node !== document.documentElement && guard++ < 12) {
        const c = getComputedStyle(node);
        if (c.backgroundColor && !c.backgroundColor.startsWith("rgba(0, 0, 0, 0") && c.backgroundColor !== "transparent") { bg = lum(c.backgroundColor); break; }
        if (c.backgroundImage && c.backgroundImage !== "none") break;
        node = node.parentElement;
      }
      if (bg === null) { const c = getComputedStyle(document.body); bg = lum(c.backgroundColor); }
      if (Math.abs(bg - ink) < 0.18) {
        out.push(el.tagName + "." + (el.className?.toString?.().slice(0, 40) ?? "") + " bg~" + bg.toFixed(2) + " ink~" + ink.toFixed(2) + " :" + el.textContent.trim().slice(0, 40));
      }
    }
    return out.slice(0, 12);
  });
  res.length === 0 ? ok(`${name}: contrast clean`) : bad(`${name}: ${res.length} low-contrast -> ${res.slice(0,4).join(" | ")}`);
}
await dp.evaluate(() => localStorage.setItem("hume-theme", "dark"));
for (const [route, name] of [["/", "home(d)"], ["/articles/feeling-stuck-going-nowhere", "article(d)"], ["/search", "search(d)"], ["/settings", "settings(d)"], ["/library", "library(d)"], ["/sign-in", "signin(d)"], ["/corners", "corners(d)"], ["/english/vocabulary", "vocab(d)"]]) {
  await contrastScan(dp, route, name);
}

// ---------- 8. horizontal overflow / overlap on phone ----------
console.log("\n[8] Phone overflow scan");
for (const [route, name] of [["/", "home"], ["/explore", "explore"], ["/search", "search"], ["/articles/feeling-stuck-going-nowhere", "article"], ["/corners", "corners"], ["/library", "library"], ["/settings", "settings"], ["/archive", "archive"]]) {
  await p.goto(BASE + route, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  overflow <= 2 ? ok(`${name}: no h-overflow (${overflow}px)`) : bad(`${name}: h-overflow ${overflow}px`);
}

// ---------- 9. sign-in links present ----------
console.log("\n[9] Sign-in on every page");
for (const route of ["/", "/explore", "/archive", "/search", "/corners", "/paths", "/articles/feeling-stuck-going-nowhere", "/about"]) {
  const r = await p.request.get(BASE + route);
  const html = await r.text();
  html.includes("/sign-in") ? ok(`${route}: sign-in reachable`) : bad(`${route}: no sign-in link`);
}

// ---------- 10. appearance panel ----------
console.log("\n[10] Appearance panel (settings)");
await dp.goto(BASE + "/settings", { waitUntil: "domcontentloaded" });
await dp.waitForTimeout(1500);
const panelBtn = dp.locator("button", { hasText: /appearance|Appearance/i }).first();
if (await panelBtn.count()) {
  await panelBtn.click();
  await dp.waitForTimeout(300);
  const pop = await dp.locator(".appearance-pop:not([hidden])").count();
  pop > 0 ? ok("appearance panel opens") : bad("appearance panel does not open");
  await dp.locator("h1").first().click({ force: true });
  await dp.waitForTimeout(300);
  const closed = await dp.locator(".appearance-pop:not([hidden])").count();
  closed === 0 ? ok("appearance panel closes outside") : bad("appearance panel stays open on outside tap");
} else bad("appearance button not found on settings");

// ---------- 11. dek lengths ----------
console.log("\n[11] Dek length on cards");
const r = await dp.request.get(BASE + "/");
const html = await r.text();
const deks = [...html.matchAll(/<p class="dek">([\s\S]*?)<\/p>/g)].map((m) => m[1]);
deks.length > 0 && deks.every((d) => d.length > 80)
  ? ok(`deks substantial (${deks.length} shown)`)
  : console.log("  -- : card deks on homepage: " + deks.length);

// ---------- 12. bookmark + comment + notif on article ----------
console.log("\n[12] Reader widgets present");
const art = await p.request.get(BASE + "/articles/feeling-stuck-going-nowhere");
const artHtml = await art.text();
artHtml.includes("bookmark-fab") ? ok("bookmark fab present") : bad("bookmark fab missing");
artHtml.includes("Conversation") ? ok("comments section present") : bad("comments missing");
artHtml.includes("Words to notice") ? ok("vocab rail present") : bad("vocab rail missing");

console.log("\n========================");
console.log(issues.length === 0 ? "ALL CLEAN" : `${issues.length} ISSUES:`);
issues.forEach((i) => console.log(" -", i));
await b.close();
process.exit(0);
