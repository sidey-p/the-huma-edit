/** Library flow test: save, progress, highlight, then read back. */
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { api } from "../convex/_generated/api.js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const anon = new ConvexHttpClient(url);

const signIn = await anon.action(anyApi.auth.signIn, {
  provider: "password",
  params: {
    email: "owner@humanedit.test",
    password: "testpassword123",
    flow: "signIn",
  },
});
const client = new ConvexHttpClient(url);
client.setAuth(signIn.tokens.token ?? signIn.tokens.accessToken);

const id = await client.query(anyApi.articles.getIdBySlug, {
  slug: "what-the-tide-left",
});
console.log("article:", id);

// 1. Save
const r1 = await client.mutation(api.library.toggleSave, { articleId: id });
console.log("1. save ->", r1);

// 2. Progress at 42%
await client.mutation(api.library.updateReadingProgress, {
  articleId: id,
  progressPercent: 42,
  scrollAnchor: "2000",
});
const p = await client.query(api.library.getReadingProgress, { articleId: id });
console.log(`2. progress -> ${Math.round(p.progressPercent)}%`);

// 3. Highlight
await client.mutation(api.library.createHighlight, {
  articleId: id,
  selectedText: "Dogs, obviously, do not drink tea.",
  note: "the whole miracle, that turning",
  style: "yellow",
});
console.log("3. highlight created");

// 4. Read back everything
const saved = await client.query(api.library.listSaved, {});
console.log(`4a. saved list: ${saved.length} item(s) — first: "${saved[0]?.title}"`);

const cont = await client.query(api.library.listContinueReading, {});
console.log(
  `4b. continue reading: ${cont.length} — "${cont[0]?.title}" at ${Math.round(cont[0]?.progressPercent ?? 0)}%`,
);

const hl = await client.query(api.library.listMyHighlights, {});
console.log(`4c. highlights: ${hl.length} — "${hl[0]?.selectedText}"`);
