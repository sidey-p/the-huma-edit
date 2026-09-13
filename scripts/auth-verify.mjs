/** Verify signed-in user profile via token. */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_CONVEX_URL;

// Re-sign-in to get a fresh token
const client = new ConvexHttpClient(url);
const result = await client.action(
  (
    await import("convex/server")
  ).anyApi.auth.signIn,
  {
    provider: "password",
    params: {
      email: "owner@humanedit.test",
      password: "testpassword123",
      flow: "signIn",
    },
  },
);

const token = result.tokens?.token ?? result.tokens?.accessToken;
if (!token) {
  console.log("No token in result:", JSON.stringify(result).slice(0, 200));
  process.exit(1);
}

const authed = new ConvexHttpClient(url);
authed.setAuth(token);
const profile = await authed.query(api.profiles.getMyProfile, {});
console.log(
  profile
    ? `Profile OK — role: ${profile.role}, name: ${profile.fullName ?? "n/a"}`
    : "Profile MISSING - afterUserCreatedOrUpdated did not fire",
);

// Also verify the desk query works with the owner token
const desk = await authed.query(api.articles.listDesk, {});
console.log(
  `Desk OK — drafts: ${desk.drafts.length}, review queue: ${desk.reviewQueue.length}`,
);
