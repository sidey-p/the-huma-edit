"use client";

/**
 * §bookmarks : floating ribbon while reading: saves exact position.
 * Guests: localStorage. Signed-in: article_bookmarks in db.
 * #resume anchor scrolls back to the saved line on return.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

function articleSlugFromUrl() {
  if (typeof window === "undefined") return "";
  return window.location.pathname.split("/").pop() ?? "";
}

export function BookmarkFab({ articleId }: { articleId: string }) {
  const [saved, setSaved] = useState(false);
  const [savedPercent, setSavedPercent] = useState(0);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase
          .from("article_bookmarks")
          .select("position_percent")
          .eq("article_id", articleId)
          .maybeSingle();
        if (data) {
          setSaved(true);
          setSavedPercent(Math.round(Number(data.position_percent)));
        }
      } else {
        try {
          const raw = JSON.parse(localStorage.getItem("hume-bookmarks") ?? "[]");
          const found = raw.find(
            (b: { slug: string }) => b.slug === articleSlugFromUrl(),
          );
          if (found) {
            setSaved(true);
            setSavedPercent(found.percent);
          }
        } catch {}
      }
    });
  }, [articleId]);

  const toggle = async () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 100;
    const slug = articleSlugFromUrl();

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (saved) {
      if (user) {
        await supabase.from("article_bookmarks").delete().eq("article_id", articleId);
      } else {
        const raw = JSON.parse(localStorage.getItem("hume-bookmarks") ?? "[]");
        localStorage.setItem(
          "hume-bookmarks",
          JSON.stringify(raw.filter((b: { slug: string }) => b.slug !== slug)),
        );
      }
      setSaved(false);
    } else {
      const title = document.querySelector("h1")?.textContent ?? "Untitled";
      if (user) {
        await supabase.from("article_bookmarks").upsert({
          user_id: user.id,
          article_id: articleId,
          position_percent: p,
          scroll_anchor: String(Math.round(window.scrollY)),
        });
      } else {
        const raw = JSON.parse(localStorage.getItem("hume-bookmarks") ?? "[]");
        const next = [
          { id: `local-${Date.now()}`, slug, title, percent: Math.round(p) },
          ...raw.filter((b: { slug: string }) => b.slug !== slug),
        ];
        localStorage.setItem("hume-bookmarks", JSON.stringify(next));
      }
      setSaved(true);
      setSavedPercent(Math.round(p));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1400);
    }
  };

  return (
    <>
      <button
        className={`bookmark-fab ${saved ? "active" : ""}`}
        onClick={toggle}
        aria-pressed={saved}
        aria-label={
          saved
              ? `Bookmark saved at ${savedPercent}%. Tap to remove`
              : "Bookmark this position"
        }
        type="button"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>
      {justSaved && (
        <span
          className="meta-line fixed z-50 whitespace-nowrap rounded-editorial border border-line bg-paper-raised px-3 py-1.5"
          style={{ right: "1.1rem", bottom: "5.2rem", color: "var(--orange)" }}
          role="status"
        >
          Line kept. Resume from the bookmark menu
        </span>
      )}
    </>
  );
}

/**
 * Resume from last session: if #resume in URL, scrolls to the last
 * saved scroll anchor (bookmark or reading progress).
 */
export function ResumeAnchor() {
  useEffect(() => {
    if (!window.location.hash.includes("resume")) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      let anchorY: number | null = null;
      const articleId = window.location.pathname.split("/").pop();
      if (user && articleId) {
        const { data } = await supabase
          .from("reading_progress")
          .select("scroll_anchor")
          .eq("article_id", articleId)
          .maybeSingle();
        anchorY = data?.scroll_anchor ? Number(data.scroll_anchor) : null;
      }
      if (anchorY === null) {
        anchorY = Number(sessionStorage.getItem("hume-last-scroll") ?? 0);
      }
      if (anchorY > 0) {
        setTimeout(() => window.scrollTo({ top: anchorY }), 350);
      }
    });
  }, []);
  return null;
}

