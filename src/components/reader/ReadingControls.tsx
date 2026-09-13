"use client";

/**
 * Reading controls (7.4/7.5): text appearance + theme.
 * Curated presets only - light / dark / warm, four sizes, two faces.
 * Persists to readerPreferences when signed in; localStorage otherwise.
 */

import { useEffect, useState } from "react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

type Theme = "light" | "dark" | "warm";
type Size = "s" | "m" | "l" | "xl";

const SIZES: Record<Size, string> = {
  s: "1.0625rem",
  m: "1.1875rem",
  l: "1.3125rem",
  xl: "1.4375rem",
};

const THEME_BG: Record<Theme, string> = {
  light: "#ffffff",
  dark: "#12110f",
  warm: "#f6efe2",
};

export function ReadingControls() {
  const { isAuthenticated } = useConvexAuth();
  const prefs = useQuery(
    api.preferences.getMyPreferences,
    isAuthenticated ? {} : "skip",
  );
  const update = useMutation(api.preferences.updatePreferences);

  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [size, setSize] = useState<Size>("m");

  // Hydrate from server prefs or localStorage (deferred to avoid sync setState)
  useEffect(() => {
    const t = setTimeout(() => {
      if (isAuthenticated && prefs) {
        setTheme(prefs.readingTheme);
        setSize(prefs.fontSize);
      } else if (!isAuthenticated) {
        const lt = localStorage.getItem("the:theme") as Theme | null;
        const ls = localStorage.getItem("the:size") as Size | null;
        if (lt) setTheme(lt);
        if (ls) setSize(ls);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [isAuthenticated, prefs]);

  // Apply to the article element
  useEffect(() => {
    const article = document.querySelector("article[data-reading-theme]");
    if (article) {
      (article as HTMLElement).dataset.readingTheme = theme;
      (article as HTMLElement).style.background = THEME_BG[theme];
    }
    document.querySelectorAll<HTMLElement>(".article-body").forEach((el) => {
      el.style.fontSize = SIZES[size];
    });
    if (!isAuthenticated) {
      localStorage.setItem("the:theme", theme);
      localStorage.setItem("the:size", size);
    }
  }, [theme, size, isAuthenticated]);

  const set = async (t: Theme | null, s: Size | null) => {
    if (t) setTheme(t);
    if (s) setSize(s);
    if (isAuthenticated) {
      await update({
        ...(t ? { readingTheme: t } : {}),
        ...(s ? { fontSize: s } : {}),
      });
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        className="meta-line flex items-center gap-1.5 rounded-editorial border border-line px-3 py-1.5 transition-colors hover:border-line-strong"
      >
        <svg
          aria-hidden="true"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
        Appearance
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-48 rounded-editorial border border-line bg-paper-raised p-4 shadow-sm">
          <fieldset>
            <legend className="meta-line mb-2 font-medium">Theme</legend>
            <div className="flex gap-2">
              {(["light", "warm", "dark"] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => set(t, null)}
                  aria-pressed={theme === t}
                  className="flex-1 rounded-editorial-sm border px-2 py-1.5 text-xs capitalize transition-colors"
                  style={{
                    borderColor: theme === t ? "var(--accent)" : "var(--line)",
                    color: theme === t ? "var(--accent)" : "inherit",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-4">
            <legend className="meta-line mb-2 font-medium">Text size</legend>
            <div className="flex gap-2">
              {(["s", "m", "l", "xl"] as Size[]).map((s) => (
                <button
                  key={s}
                  onClick={() => set(null, s)}
                  aria-pressed={size === s}
                  className="flex-1 rounded-editorial-sm border px-2 py-1.5 text-xs transition-colors"
                  style={{
                    borderColor: size === s ? "var(--accent)" : "var(--line)",
                    color: size === s ? "var(--accent)" : "inherit",
                  }}
                >
                  {s === "s"
                    ? "A"
                    : s === "m"
                      ? "A+"
                      : s === "l"
                        ? "A++"
                        : "A+++"}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}
