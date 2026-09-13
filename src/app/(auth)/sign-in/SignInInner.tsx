"use client";

/**
 * Reader/author sign-in (§37). Email + password via Convex Auth.
 * The first account created on a fresh deployment becomes the owner.
 */

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export default function SignInInner() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const myProfile = useQuery(
    api.profiles.getMyProfile,
    isAuthenticated ? {} : "skip",
  );

  // Signed in already -> route by role (§31)
  if (!isLoading && isAuthenticated && myProfile) {
    router.replace(myProfile.role !== "reader" ? "/studio" : "/library");
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        // createAccount then sign in
        await signIn("password", {
          email,
          password,
          flow: "signIn",
        } as never);
      } else {
        await signIn("password", { email, password } as never);
      }
      // onSignedIn handled by the auth state effect above
    } catch (err) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Could not sign in. Check your email and password.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-24 sm:px-6">
      <p className="meta-line">The Human Edit</p>
      <h1 className="display-lg mt-2">
        {mode === "signin" ? "Welcome back." : "Join the reading room."}
      </h1>
      <p className="mt-3 text-ink-muted">
        {mode === "signin"
          ? "Your library, highlights, and reading paths are waiting."
          : "Save pieces, highlight passages, keep your place."}
      </p>

      <form onSubmit={submit} className="mt-10 space-y-4">
        <div>
          <label htmlFor="email" className="meta-line block">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="mt-2 w-full rounded-editorial border border-line bg-paper-raised px-4 py-2.5 focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="meta-line block">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="mt-2 w-full rounded-editorial border border-line bg-paper-raised px-4 py-2.5 focus:border-accent focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-editorial border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy
            ? "One moment…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-error">{error}</p>}

      <p className="mt-8 text-sm text-ink-muted">
        {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="text-accent underline"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
