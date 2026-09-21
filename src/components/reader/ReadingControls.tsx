"use client";

/**
 * Reading controls (7.4/7.5): text appearance + theme.
 * Curated presets only - light / dark / warm, four sizes.
 * Persists to reader_preferences when signed in; localStorage otherwise.
 * The reading surface follows CSS tokens; no inline hex backgrounds,
 * so site dark mode can never fight the reading theme.
 */

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type Theme = "light" | "dark" | "warm";
type Size = "s" | "m" | "l" | "xl";

const SIZES: Record<Size, string> = {
  s: "1.0625rem",
  m: "1.1875rem",
  l: "1.3125rem",
  xl: "1.4375rem",
};

export function ReadingControls() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [size, setSize] = useState<Size>("m");
  const [ready, setReady] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  // Hydrate from db (signed-in) or localStorage (guests); default follows site theme.
  useEffect(() => {
    const t = setTimeout(async () => {
      const siteDark =
        document.documentElement.getAttribute("data-theme") === "dark";
      const fallback: Theme = siteDark ? "dark" : "light";
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("reader_preferences")
          .select("reading_theme, font_size")
          .maybeSingle();
        setTheme((data?.reading_theme as Theme) ?? fallback);
        setSize((data?.font_size as Size) ?? "m");
      } else {
        const lt = localStorage.getItem("the:theme") as Theme | null;
        const ls = localStorage.getItem("the:size") as Size | null;
        setTheme(lt ?? fallback);
        setSize(ls ?? "m");
      }
      setReady(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Apply via data attribute + CSS variables only (dark-mode safe).
  useEffect(() => {
    if (!ready) return;
    const article = document.querySelector("article[data-reading-theme]");
    if (article) (article as HTMLElement).dataset.readingTheme = theme;
    document.querySelectorAll<HTMLElement>(".article-body").forEach((el) => {
      el.style.fontSize = SIZES[size];
    });
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        void supabase.from("reader_preferences").upsert({
          user_id: user.id,
          reading_theme: theme,
          font_size: size,
          updated_at: new Date().toISOString(),
        });
      } else {
        localStorage.setItem("the:theme", theme);
        localStorage.setItem("the:size", size);
      }
    });
  }, [theme, size, ready]);

  // outside-tap close
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (hostRef.current && !hostRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  return (
    <div className="appearance-host relative" ref={hostRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        data-appearance-open={open}
        className="appearance-trigger meta-line flex items-center gap-1.5 rounded-editorial border border-line px-3 py-1.5 transition-colors hover:border-line-strong"
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
        <>
          <div className="appearance-backdrop" onClick={() => setOpen(false)} />
          <div className="appearance-pop" role="dialog" aria-label="Reading appearance">
            <fieldset>
              <legend className="meta-line mb-2 font-medium">Theme</legend>
              <div className="flex gap-2">
                {(["light", "warm", "dark"] as Theme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
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
                    onClick={() => setSize(s)}
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
        </>
      )}
    </div>
  );
}
