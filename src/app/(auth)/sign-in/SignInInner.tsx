"use client";

/**
 * Reader/author sign-in (§37). Email + password + username via Supabase Auth.
 * The first account created on a fresh deployment becomes the owner.
 */

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function SignInInner() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        if (username.trim().length < 2) {
          throw new Error("Pick a name others will see (2+ characters).");
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: username.trim() } },
        });
        if (signUpError) throw signUpError;
        // store the public username on the profile row
        if (data.user) {
          await supabase
            .from("profiles")
            .update({
              username: username.trim(),
              full_name: username.trim(),
            })
            .eq("id", data.user.id);
        }
      } else {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }

      // Route by role (§31): staff → Studio, readers → Library.
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .single();
      router.replace(
        profile && profile.role !== "reader" ? "/studio" : "/library",
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
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
        {mode === "signup" && (
          <div>
            <label htmlFor="username" className="meta-line block">
              Your name
            </label>
            <input
              id="username"
              type="text"
              required
              minLength={2}
              maxLength={40}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="nickname"
              placeholder="Shown on comments and highlights"
              className="mt-2 w-full rounded-editorial border border-line bg-paper-raised px-4 py-2.5 focus:border-accent focus:outline-none"
            />
          </div>
        )}
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
