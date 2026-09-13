/** Full editorial workflow test: create -> save -> review -> approve -> publish. */
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { api } from "../convex/_generated/api.js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_CONVEX_URL;

// Sign in as owner
const anon = new ConvexHttpClient(url);
const signIn = await anon.action(anyApi.auth.signIn, {
  provider: "password",
  params: {
    email: "owner@humanedit.test",
    password: "testpassword123",
    flow: "signIn",
  },
});
const token = signIn.tokens.token ?? signIn.tokens.accessToken;
const client = new ConvexHttpClient(url);
client.setAuth(token);

// 1. Create draft
const articleId = await client.mutation(api.articles.create, {
  title: "A Test Piece About Testing",
});
console.log("1. created:", articleId);

// 2. Save draft content
await client.mutation(api.articles.saveDraft, {
  articleId,
  title: "A Test Piece About Testing",
  dek: "Does the editorial workflow hold?",
  contentJson: {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "The checklist" }] },
      { type: "paragraph", content: [{ type: "text", text: "Create, save, review, approve, publish." }] },
    ],
  },
  contentText: "The checklist Create, save, review, approve, publish.",
  humanAuthorshipAttested: true,
});
console.log("2. draft saved");

// 3. Submit for review
await client.mutation(api.articles.submitForReview, { articleId });
console.log("3. submitted for review");

// 4. Approve (owner = senior_editor+)
await client.mutation(api.articles.approve, { articleId });
console.log("4. approved");

// 5. Publish
await client.mutation(api.articles.publish, { articleId });
console.log("5. published");

// 6. Verify it's public
const pub = await anon.query(api.articles.getBySlug, {
  slug: "a-test-piece-about-testing",
});
console.log(
  "6. public read:",
  pub ? `"${pub.title}" by ${pub.author?.displayName ?? "unassigned"} (${pub.wordCount} words)` : "NOT FOUND",
);

// 7. Verify desk shows it
const desk = await client.query(api.articles.listDesk, {});
console.log(`7. desk drafts: ${desk.drafts.length}`);
