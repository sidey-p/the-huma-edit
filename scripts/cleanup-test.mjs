/** Remove the workflow test article (by slug, any status). */
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = new ConvexHttpClient(url);

const signIn = await client.action(anyApi.auth.signIn, {
  provider: "password",
  params: {
    email: "owner@humanedit.test",
    password: "testpassword123",
    flow: "signIn",
  },
});
const authed = new ConvexHttpClient(url);
authed.setAuth(signIn.tokens.token ?? signIn.tokens.accessToken);

const id = await authed.query(anyApi.articles.getIdBySlug, {
  slug: "a-test-piece-about-testing",
});
if (id) {
  await authed.mutation(anyApi.articles.deleteById, { articleId: id });
  console.log("test article removed:", id);
} else {
  console.log("no test article found");
}
