"use client";

/**
 * Continue-reading prompt: appears once per session on the homepage.
 * Asks "Continue where you left off?" with Yes / Fresh start.
 * Guests: sessionStorage+localStorage; signed-in: db reading_progress.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

export function ContinueBanner() {
  const [item, setItem] = useState<{
    slug: string;
    title: string;
    percent: number;
  } | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("hume-continue-dismissed")) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase
          .from("reading_progress")
          .select("progress_percent, articles ( slug, title )")
          .is("completed_at", null)
          .gt("progress_percent", 3)
          .order("last_read_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const row = data as
          | { progress_percent: number; articles: { slug: string; title: string } | null }
          | null;
        if (row?.articles) {
          setItem({
            slug: row.articles.slug,
            title: row.articles.title,
            percent: Math.round(Number(row.progress_percent)),
          });
        }
      } else {
        try {
          const raw = JSON.parse(localStorage.getItem("hume-bookmarks") ?? "[]");
          if (raw.length > 0 && raw[0].percent >= 5) {
            setItem(raw[0]);
          }
        } catch {}
      }
    });
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("hume-continue-dismissed", "1");
    setItem(null);
  };

  if (!item) return null;

  return (
    <div className="continue-banner" role="dialog" aria-label="Continue reading">
      <div className="min-w-0">
        <p className="meta-line">Continue where you left off?</p>
        <Link
          href={`/articles/${item.slug}#resume`}
          className="mt-1 block truncate font-display text-lg text-ink transition-colors hover:text-accent"
        >
          {item.title}
        </Link>
        <p className="meta-line mt-0.5">{item.percent}% through</p>
      </div>
      <div className="flex gap-2">
        <Link
          href={`/articles/${item.slug}#resume`}
          className="btn btn-primary"
          style={{ padding: "0.5rem 1rem", fontSize: "var(--step--1)" }}
        >
          Yes, continue
        </Link>
        <button
          onClick={dismiss}
          className="btn btn-ghost"
          style={{ padding: "0.5rem 1rem", fontSize: "var(--step--1)" }}
        >
          Fresh start
        </button>
      </div>
    </div>
  );
}
