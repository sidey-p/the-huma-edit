/**
 * Local dev seeder - runs convex functions from Node using the real client.
 * Usage: node scripts/seed.mjs
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!url) {
  console.error("NEXT_PUBLIC_CONVEX_URL not set in .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(url);

console.log("Seeding via ConvexHttpClient ->", url);
try {
  const result = await client.action(api.seed.devSeed, {});
  console.log("Seed result:", JSON.stringify(result));
} catch (err) {
  console.error("Seed failed:", err.message ?? err);
  process.exit(1);
}

// Verify
try {
  const articles = await client.query(api.articles.listPublished, { limit: 50 });
  console.log(`\nVerified: ${articles.length} published articles:`);
  for (const a of articles.slice(0, 25)) {
    console.log(` - [${a.contentType ?? "?"}] ${a.title}`);
  }
} catch (err) {
  console.error("Verify failed:", err.message ?? err);
}
