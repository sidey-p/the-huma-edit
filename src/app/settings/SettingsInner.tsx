"use client";

/**
 * Settings: reader account: name, avatar (base64), password,
 * appearance, privacy. All persisted to profiles + Supabase Auth.
 * Guests can still manage appearance locally.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

export function SettingsInner() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [role, setRole] = useState("reader");
  const [msg, setMsg] = useState<string | null>(null);
  const [pwNew, setPwNew] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // appearance state (works for guests too)
  const [siteTheme, setSiteTheme] = useState<"light" | "dark" | "auto">("auto");
  const [readingTheme, setReadingTheme] = useState<"light" | "dark" | "warm">("light");
  const [fontSize, setFontSize] = useState<"s" | "m" | "l" | "xl">("m");

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setSignedIn(true);
        const { data } = await supabase
          .from("profiles")
          .select("role, full_name, username, avatar_base64")
          .maybeSingle();
        if (data) {
          setRole(data.role ?? "reader");
          setName(data.username ?? data.full_name ?? user.email ?? "");
          setAvatar(data.avatar_base64);
        }
        // Load preferences from db
        const { data: prefs } = await supabase
          .from("reader_preferences")
          .select("site_theme, reading_theme, font_size")
          .maybeSingle();
        if (prefs) {
          setSiteTheme((prefs.site_theme as "light" | "dark" | "auto") ?? "auto");
          setReadingTheme((prefs.reading_theme as "light" | "dark" | "warm") ?? "light");
          setFontSize((prefs.font_size as "s" | "m" | "l" | "xl") ?? "m");
        }
      } else {
        // Guest: load from localStorage
        const stored = localStorage.getItem("hume-theme") || "auto";
        setSiteTheme(stored as "light" | "dark" | "auto");
        const rt = localStorage.getItem("the:theme") as "light" | "dark" | "warm" | null;
        const fs = localStorage.getItem("the:size") as "s" | "m" | "l" | "xl" | null;
        if (rt) setReadingTheme(rt);
        if (fs) setFontSize(fs);
      }
      setLoading(false);
    });
  }, []);

  const saveProfile = async () => {
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ username: name.trim(), full_name: name.trim(), updated_at: new Date().toISOString() });
    setMsg(error ? error.message : "Profile saved.");
  };

  const onAvatar = async (file: File) => {
    if (file.size > 400 * 1024) {
      setMsg("Image too large: pick one under 400 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setAvatar(dataUrl);
      const supabase = createClient();
      await supabase
        .from("profiles")
        .update({ avatar_base64: dataUrl, updated_at: new Date().toISOString() });
      setMsg("Picture updated.");
    };
    reader.readAsDataURL(file);
  };

  const changePassword = async () => {
    setMsg(null);
    if (pwNew.length < 8) {
      setMsg("New password needs at least 8 characters.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: pwNew,
    });
    setPwNew("");
    setMsg(error ? error.message : "Password changed.");
  };

  const saveSiteTheme = async (theme: "light" | "dark" | "auto") => {
    setSiteTheme(theme);
    // Apply immediately
    try { localStorage.setItem("hume-theme", theme); } catch {}
    const root = document.documentElement;
    const resolved = theme === "auto"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    root.setAttribute("data-theme", resolved);
    root.setAttribute("data-theme-mode", theme);
    root.style.colorScheme = resolved;
    // Persist to db if signed in
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("reader_preferences").upsert({
        user_id: user.id,
        site_theme: theme,
        updated_at: new Date().toISOString(),
      });
    }
    setMsg("Site theme saved.");
  };

  const saveReadingTheme = async (theme: "light" | "dark" | "warm") => {
    setReadingTheme(theme);
    try { localStorage.setItem("the:theme", theme); } catch {}
    const article = document.querySelector("article[data-reading-theme]");
    if (article) (article as HTMLElement).dataset.readingTheme = theme;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("reader_preferences").upsert({
        user_id: user.id,
        reading_theme: theme,
        updated_at: new Date().toISOString(),
      });
    }
    setMsg("Reading theme saved.");
  };

  const saveFontSize = async (size: "s" | "m" | "l" | "xl") => {
    setFontSize(size);
    try { localStorage.setItem("the:size", size); } catch {}
    const SIZES: Record<string, string> = { s: "1.0625rem", m: "1.1875rem", l: "1.3125rem", xl: "1.4375rem" };
    document.querySelectorAll<HTMLElement>(".article-body").forEach((el) => {
      el.style.fontSize = SIZES[size];
    });
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("reader_preferences").upsert({
        user_id: user.id,
        font_size: size,
        updated_at: new Date().toISOString(),
      });
    }
    setMsg("Font size saved.");
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/");
  };

  if (loading) return <p className="text-ink-muted">Opening settings...</p>;

  return (
    <div className="space-y-10">
      {signedIn && (
        <section>
          <h2 className="font-display text-xl">Account</h2>
          <p className="meta-line mt-1 capitalize">Role: {role.replace("_", " ")}</p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt="Your profile picture"
                className="h-16 w-16 rounded-full object-cover border border-line"
              />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-full border border-line bg-paper-sunken font-display text-2xl text-ink-muted">
                {name.slice(0, 1).toUpperCase() || "?"}
              </span>
            )}
            <div>
              <button
                onClick={() => fileRef.current?.click()}
                className="btn btn-ghost"
                style={{ padding: "0.5rem 1rem", fontSize: "var(--step--1)" }}
              >
                Change picture
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onAvatar(f);
                }}
              />
              <p className="meta-line mt-1">PNG or JPEG, under 400 KB.</p>
            </div>
          </div>

          <div className="mt-5 max-w-sm">
            <label htmlFor="display-name" className="meta-line block">
              Display name
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                className="w-full rounded-editorial border border-line bg-paper-raised px-3.5 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <button
                onClick={saveProfile}
                className="shrink-0 rounded-editorial border border-accent bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
              >
                Save
              </button>
            </div>
          </div>
        </section>
      )}

      {signedIn && (
        <section>
          <h2 className="font-display text-xl">Password</h2>
          <div className="mt-3 max-w-sm space-y-2.5">
            <input
              type="password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              placeholder="New password (8+ characters)"
              aria-label="New password"
              className="w-full rounded-editorial border border-line bg-paper-raised px-3.5 py-2 text-sm focus:border-accent focus:outline-none"
            />
            <button
              onClick={changePassword}
              className="rounded-editorial border border-line px-4 py-2 text-sm transition-colors hover:border-accent"
            >
              Change password
            </button>
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-xl">Appearance</h2>
        <p className="meta-line mt-2">
          {signedIn
            ? "Preferences sync across your devices."
            : "Saved on this browser. Sign in to sync across devices."}
        </p>

        <div className="mt-4 space-y-5">
          <div>
            <p className="meta-line font-medium mb-2">Site theme</p>
            <div className="flex gap-2">
              {(["light", "dark", "auto"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => saveSiteTheme(t)}
                  className="rounded-editorial border px-4 py-2 text-sm capitalize transition-colors"
                  style={{
                    borderColor: siteTheme === t ? "var(--accent)" : "var(--line)",
                    color: siteTheme === t ? "var(--accent)" : "inherit",
                    background: siteTheme === t ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent",
                  }}
                >
                  {t === "auto" ? "System" : t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="meta-line font-medium mb-2">Reading theme</p>
            <div className="flex gap-2">
              {(["light", "warm", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => saveReadingTheme(t)}
                  className="rounded-editorial border px-4 py-2 text-sm capitalize transition-colors"
                  style={{
                    borderColor: readingTheme === t ? "var(--accent)" : "var(--line)",
                    color: readingTheme === t ? "var(--accent)" : "inherit",
                    background: readingTheme === t ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="meta-line font-medium mb-2">Text size</p>
            <div className="flex gap-2">
              {([
                ["s", "A"],
                ["m", "A+"],
                ["l", "A++"],
                ["xl", "A+++"],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => saveFontSize(k)}
                  className="rounded-editorial border px-4 py-2 text-sm transition-colors"
                  style={{
                    borderColor: fontSize === k ? "var(--accent)" : "var(--line)",
                    color: fontSize === k ? "var(--accent)" : "inherit",
                    background: fontSize === k ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl">Privacy</h2>
        <p className="meta-line mt-2">
          Your library, highlights, and reading history are private to you.
        </p>
      </section>

      {msg && (
        <p className="meta-line" style={{ color: "var(--success)" }} role="status">
          {msg}
        </p>
      )}

      {signedIn && (
        <section>
          <button
            onClick={signOut}
            className="rounded-editorial border border-line px-4 py-2 text-sm transition-colors hover:border-accent"
          >
            Sign out
          </button>
        </section>
      )}

      {!signedIn && (
        <section>
          <p className="meta-line">
            <Link href="/sign-in" className="ink-link">
              Sign in
            </Link>{" "}
            to manage your account, sync preferences, and save articles.
          </p>
        </section>
      )}
    </div>
  );
}

/** Quiet sign-in prompt for signed-out readers: no forced signup (1.3). */
export function SignedOutNote() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setShow(!user));
  }, []);
  if (!show) return null;
  return (
    <p className="meta-line">
      <Link href="/sign-in" className="ink-link">
        Sign in
      </Link>{" "}
      to manage your account, library, and reading preferences.
    </p>
  );
}
