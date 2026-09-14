/**
 * One-off: push the longer dek summaries from supabase/seedContent.ts
 * into the live articles table (service role required for update).
 * Run: node scripts/push-deks.mjs
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import pg from "pg";

// pull env from .env.local
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const url = new URL(process.env.DATABASE_URL ?? "");
console.log("Using DB:", url.host);
const client = new pg.Client({
  host: url.hostname,
  port: url.port || 5432,
  database: url.pathname.slice(1),
  user: url.username,
  password: url.password,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

// Parse ARTICLES array out of the TS module by evaluating with a stub.
const src = readFileSync("supabase/seedContent.ts", "utf8");
const mod = src.slice(src.indexOf("export const ARTICLES"));
const articles = new Function(
  `${mod.slice(0, mod.indexOf("export const READING_PATH"))
    .replace("export const ARTICLES", "const ARTICLES")
    .replace(/: SeedArticle\[\]/, "")
    .replace(/export interface[\s\S]*?^};/m, "")
    .replace("export const", "const")};\nreturn ARTICLES;`)(),
);

let n = 0;
for (const a of articles) {
  const r = await client.query(
    "update articles set dek = $1 where slug = $2 and (dek is distinct from $1) returning slug",
    [a.dek, a.slug],
  );
  n += r.rowCount;
}
console.log("deks updated:", n);
await client.end();
