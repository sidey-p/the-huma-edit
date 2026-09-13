/** Search smoke test: natural-language query -> hybrid ranking -> cards. */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!url) {
  console.error("NEXT_PUBLIC_CONVEX_URL not set");
  process.exit(1);
}
const client = new ConvexHttpClient(url);

const queries = [
  "why do I feel like I'm not moving forward?",
  "learning english vocabulary",
  "how to sleep better",
  "articles about loneliness and starting over",
];

for (const q of queries) {
  console.log(`\nQ: "${q}"`);
  try {
    const hits = await client.action(api.search.searchArticles, {
      query: q,
      limit: 5,
    });
    if (hits.length === 0) {
      console.log("  (no results)");
      continue;
    }
    const cards = await Promise.all(
      hits.map((h) =>
        client.query(api.articles.getCardById, { id: h.articleId }),
      ),
    );
    cards.forEach((c, i) => {
      if (c)
        console.log(
          `  ${i + 1}. [${c.cornerName ?? "-"}] ${c.title} (score ${hits[i].score.toFixed(3)})`,
        );
    });
  } catch (err) {
    console.log("  ERROR:", err && err.message ? err.message : err);
  }
}
