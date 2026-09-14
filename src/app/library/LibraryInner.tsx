"use client";

/**
 * Library (4.2, 10): saved, highlights, history, continue reading.
 * Empty states per 39 - never dead ends.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { formatDate } from "@/lib/format";

type Tab = "saved" | "highlights" | "history";

type SavedRow = { article_id: string; created_at: string; articles: { slug: string; title: string; dek: string | null } | null };
type HighlightRow = { id: string; selected_text: string; note: string | null; articles: { slug: string; title: string } | null };
type ContinueRow = { article_id: string; progress_percent: number; last_read_at: string; articles: { slug: string; title: string } | null };
type HistoryRow = { article_id: string; last_seen_at: string; articles: { slug: string; title: string } | null; reading_progress: { progress_percent: number; completed_at: string | null }[] | null };

export default function LibraryInner() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [highlights, setHighlights] = useState<HighlightRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [continueReading, setContinueReading] = useState<ContinueRow[]>([]);
  const [tab, setTab] = useState<Tab>("saved");

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      setSignedIn(true);

      const [savedQ, hlQ, contQ, histQ] = await Promise.all([
        supabase
          .from("saved_articles")
          .select("article_id, created_at, articles ( slug, title, dek )")
          .order("created_at", { ascending: false }),
        supabase
          .from("highlights")
          .select("id, selected_text, note, articles ( slug, title )")
          .order("created_at", { ascending: false }),
        supabase
          .from("reading_progress")
          .select("article_id, progress_percent, last_read_at, articles ( slug, title )")
          .is("completed_at", null)
          .gt("progress_percent", 1)
          .order("last_read_at", { ascending: false })
          .limit(6),
        supabase
          .from("reading_history")
          .select("article_id, last_seen_at, articles ( slug, title ), reading_progress ( progress_percent, completed_at )")
          .order("last_seen_at", { ascending: false })
          .limit(50),
      ]);

      setSaved((savedQ.data ?? []) as unknown as SavedRow[]);
      setHighlights((hlQ.data ?? []) as unknown as HighlightRow[]);
      setContinueReading((contQ.data ?? []) as unknown as ContinueRow[]);
      setHistory((histQ.data ?? []) as unknown as HistoryRow[]);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <p className="text-ink-muted">Opening your library…</p>;
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="font-display text-3xl">Your library lives here.</p>
        <p className="mt-3 text-ink-muted">
          Save pieces, keep your place, collect passages you want to remember.
        </p>
        <Link
          href="/sign-in"
          className="mt-6 inline-block rounded-editorial border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* 10.5 Continue reading */}
      {continueReading.length > 0 && (
        <section className="mb-14">
          <h2 className="font-display text-2xl">Continue reading</h2>
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {continueReading.map((r) => (
              <li key={r.article_id} className="py-4">
                <Link href={`/articles/${r.articles?.slug}`} className="group block">
                  <span className="font-display text-lg text-ink transition-colors group-hover:text-accent">
                    {r.articles?.title}
                  </span>
                  <span className="meta-line mt-1 block">
                    {Math.round(Number(r.progress_percent))}% · last read{" "}
                    {formatDate(new Date(r.last_read_at).getTime())}
                  </span>
                  <span className="mt-2 block h-0.5 w-full rounded bg-line">
                    <span
                      className="block h-full rounded bg-accent"
                      style={{ width: `${Math.round(Number(r.progress_percent))}%` }}
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Library"
        className="flex gap-5 border-b border-line"
      >
        {(
          [
            ["saved", "Saved"],
            ["highlights", "Highlights"],
            ["history", "History"],
          ] as Array<[Tab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 pb-2 text-sm transition-colors ${
                tab === id
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "saved" && (
        <div className="mt-10">
          {saved.length === 0 ? (
            <EmptyLibrary
              title="Nothing saved yet."
              sub="Find something worth keeping."
            />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {saved.map((s) => (
                <li key={s.article_id} className="py-5">
                  <Link href={`/articles/${s.articles?.slug}`} className="group block">
                    <span className="font-display text-lg text-ink transition-colors group-hover:text-accent">
                      {s.articles?.title}
                    </span>
                    {s.articles?.dek && (
                      <span className="mt-1 block text-sm text-ink-muted">
                        {s.articles.dek}
                      </span>
                    )}
                    <span className="meta-line mt-1 block">
                      saved {formatDate(new Date(s.created_at).getTime())}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "highlights" && (
        <div className="mt-10">
          {highlights.length === 0 ? (
            <EmptyLibrary
              title="No passages kept yet."
              sub="Highlight the lines you want to remember."
            />
          ) : (
            <ul className="space-y-6">
              {highlights.map((h) => (
                <li key={h.id} className="border-l-2 border-accent pl-4">
                  <p className="font-display text-lg italic text-ink">
                    “{h.selected_text}”
                  </p>
                  {h.note && (
                    <p className="mt-1 text-sm text-ink-muted">{h.note}</p>
                  )}
                  <Link
                    href={`/articles/${h.articles?.slug}`}
                    className="meta-line mt-1 block transition-colors hover:text-accent"
                  >
                    {h.articles?.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="mt-10">
          {history.length === 0 ? (
            <EmptyLibrary
              title="No reading history yet."
              sub="What you read lives here."
            />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {history.map((h) => (
                <li
                  key={h.article_id}
                  className="flex items-center justify-between py-4"
                >
                  <Link
                    href={`/articles/${h.articles?.slug}`}
                    className="font-display text-lg text-ink transition-colors hover:text-accent"
                  >
                    {h.articles?.title}
                  </Link>
                  <span className="meta-line">
                    {h.reading_progress?.[0]?.completed_at
                      ? "Finished"
                     : `${Math.round(Number(h.reading_progress?.[0]?.progress_percent ?? 0))}%`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyLibrary({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="py-16 text-center">
      <p className="font-display text-2xl">{title}</p>
      <p className="mt-2 text-ink-muted">{sub}</p>
      <Link href="/corners" className="mt-6 inline-block text-accent underline">
        Explore the corners
      </Link>
    </div>
  );
}

