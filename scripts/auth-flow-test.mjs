/**
 * Auth flow test via actual Convex Auth actions (what the browser does).
 */
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = new ConvexHttpClient(url);
const api = anyApi;

// The browser calls auth:signIn action with provider params
const result = await client.action(api.auth.signIn, {
  provider: "password",
  params: {
    email: "owner@humanedit.test",
    password: "testpassword123",
    flow: "signUp",
  },
});
console.log("signIn result:", JSON.stringify(result).slice(0, 300));
