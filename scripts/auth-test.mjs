/** Auth smoke test: sign up via Convex Auth, verify profile creation. */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = new ConvexHttpClient(url);

// 1. Create a user account directly (simulating sign-up form)
const res = await fetch(`${url}/api/auth/createAccount`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Convex-Client": "scripts" },
  body: JSON.stringify({
    provider: "password",
    account: { email: "owner@humanedit.test", password: "testpassword123" },
    profile: { email: "owner@humanedit.test", emailVerified: true },
    shouldLink: true,
  }),
});
const created = await res.json();
console.log("createAccount status:", res.status, JSON.stringify(created).slice(0, 200));

// 2. Sign in to get a session
const res2 = await fetch(`${url}/api/auth/signIn`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Convex-Client": "scripts" },
  body: JSON.stringify({
    provider: "password",
    account: { email: "owner@humanedit.test", password: "testpassword123" },
  }),
});
const session = await res2.json();
console.log("signIn status:", res2.status, JSON.stringify(session).slice(0, 120));

// 3. Verify the profile was created with owner role
const token = session.tokens?.accessToken;
if (token) {
  const authed = new ConvexHttpClient(url);
  authed.setAuth(token);
  const profile = await authed.query(api.profiles.getMyProfile, {});
  console.log(
    "profile:",
    profile
      ? `${profile.fullName ?? profile.role} role=${profile.role}`
      : "NONE - callback did not fire",
  );
}
