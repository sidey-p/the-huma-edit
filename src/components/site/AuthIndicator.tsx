"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

/**
 * Compact auth-state indicator. Signed out: "Sign in" pill on every
 * page. Signed in: small avatar chip linking to settings.
 */
export function AuthIndicator() {
  const [signedIn, setSignedIn] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setSignedIn(true);
        const { data } = await supabase
          .from("profiles")
          .select("username, full_name, avatar_base64")
          .maybeSingle();
        if (data) {
          setAvatar(data.avatar_base64 ?? null);
          setName(data.username ?? data.full_name ?? null);
        }
      } else {
        setSignedIn(false);
      }
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  if (!signedIn) {
    return (
      <Link
        href="/sign-in"
        className="meta-line rounded-editorial border border-line px-3 py-1.5 transition-colors hover:border-accent hover:text-accent"
      >
        Sign in
      </Link>
    );
  }

  return (
    <Link
      href="/settings"
      className="flex items-center gap-2 rounded-editorial border border-line py-1 pl-1 pr-3 transition-colors hover:border-accent"
      aria-label={`Account: ${name ?? "your settings"}`}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt=""
          className="h-6 w-6 rounded-full object-cover"
        />
      ) : (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-paper-sunken text-xs font-semibold text-ink-muted">
          {(name ?? "?").slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="meta-line hidden max-w-24 truncate sm:block">
        {name ?? "Account"}
      </span>
    </Link>
  );
}
