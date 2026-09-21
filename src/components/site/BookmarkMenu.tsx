"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

/**
 * Bookmarks menu (§bookmarks): every article the reader bookmarked
 * mid-read, with position percentage. Tap to continue from that line.
 * Guests: localStorage; signed-in: db (this menu reads both).
 */
export function BookmarkMenu() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [items, setItems] = useState<
    Array<{ id: string; slug: string; title: string; percent: number }>
  >([]);
  const hostRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setSignedIn(true);
        const { data } = await supabase
          .from("article_bookmarks")
          .select("id, position_percent, articles ( slug, title )")
          .order("created_at", { ascending: false })
          .limit(20);
        setItems(
          ((data ?? []) as unknown as Array<{ id: string; position_percent: number; articles: { slug: string; title: string } | null }>).map((r) => ({
            id: r.id,
            slug: r.articles?.slug ?? "",
            title: r.articles?.title ?? "Untitled",
            percent: Math.round(Number(r.position_percent)),
          })),
        );
      } else {
        try {
          const raw = JSON.parse(localStorage.getItem("hume-bookmarks") ?? "[]");
          setItems(raw);
        } catch {}
      }
    });
  }, []);

return (
    <span className="notif-host relative inline-flex" ref={hostRef}>
      <button
        className="icon-btn"
        aria-label={`Bookmarks (${items.length})`}
        data-notif-open={open}
        type="button"
        onClick={() => setOpen(!open)}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="appearance-backdrop" onClick={() => setOpen(false)} />
          <div className="notif-panel" role="dialog" aria-label="Bookmarks">
            <div className="px-4 py-3 border-b border-line">
              <p className="meta-line font-medium">Your bookmarks</p>
            </div>
            {items.length === 0 ? (
              <p className="notif-body px-4 py-6 text-center">
                Nothing marked yet. The ribbon at the bottom of any article
                saves your exact line.
              </p>
            ) : (
              items.map((b) => (
                <Link
                  key={b.id}
                  href={`/articles/${b.slug}#resume`}
                  className="notif-row"
                  onClick={() => setOpen(false)}
                >
                  <p className="notif-title">{b.title}</p>
                  <p className="notif-time">{b.percent}% through</p>
                </Link>
              ))
            )}
            <div className="px-4 py-2 border-t border-line">
              <p className="notif-time">
                {signedIn ? "Synced to your account" : "Saved on this device"}
              </p>
            </div>
          </div>
        </>
      )}
    </span>
  );
}

