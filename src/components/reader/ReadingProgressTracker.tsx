"use client";

/**
 * Reading progress (7.6): thin indicator near the top.
 * Not a performance score - quietly tracks scroll, saves position (10.4).
 */

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/browser";

export function ReadingProgressTracker({ articleId }: { articleId: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const [percent, setPercent] = useState(0);
  const lastSent = useRef(0);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setSignedIn(!!user));
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const persist = (p: number, anchor: string) => {
      const supabase = createClient();
      void supabase.from("reading_progress").upsert({
        article_id: articleId,
        progress_percent: p,
        scroll_anchor: anchor,
        last_read_at: new Date().toISOString(),
        completed_at: p >= 95 ? new Date().toISOString() : null,
      });
    };

    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 100;
      setPercent(p);
      if (signedIn && Math.abs(p - lastSent.current) >= 10) {
        lastSent.current = p;
        const p2 = p;
        const anchor = String(Math.round(window.scrollY));
        // debounce the write
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => persist(p2, anchor), 500);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [articleId, signedIn]);

  return (
    <div
      className="fixed inset-x-0 top-0 z-40 h-0.5 bg-transparent"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-accent transition-[width] duration-150 ease-linear"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
