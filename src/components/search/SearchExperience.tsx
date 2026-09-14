"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { formatReadingTime, formatDate } from "@/lib/format";

/**
 * §08 Explore Search - the signature feature.
 * Natural questions in, human-written articles out (§8.1).
 * Never generates an answer (§8.8). Hybrid FTS + trigram via
 * the search_articles Postgres function (§8.5 weights).
 */

interface SearchRow {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  reading_time_seconds: number;
  published_at: string | null;
  corner_name: string | null;
  score: number;
}

export function SearchExperience() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchRow[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  const runSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    start(async () => {
      try {
        const supabase = createClient();
        const { data, error: rpcError } = await supabase.rpc("search_articles", {
          q: trimmed,
          lim: 12,
        });
        if (rpcError) throw rpcError;
        setResults((data ?? []) as SearchRow[]);
        setSearched(true);
        setError(false);
        // §16.1 analytics: log the query
        void supabase.from("search_events").insert({
          query: trimmed,
          result_count: data?.length ?? 0,
        });
      } catch {
        setError(true);
      }
    });
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      {/* §8.1 Core promise */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
        role="search"
      >
        <label htmlFor="search-q" className="meta-line block">
          What would you like to explore? Ask naturally.
        </label>
        <div className="mt-3 flex gap-2">
          <input
            id="search-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Why do I feel like I'm not moving forward?"
            autoComplete="off"
            className="w-full rounded-editorial border border-line bg-paper-raised px-4 py-3 text-lg text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !query.trim()}
            className="shrink-0 rounded-editorial border border-accent bg-accent px-5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {pending ? "Exploring…" : "Explore"}
          </button>
        </div>
      </form>

      {/* §39 Search failure state */}
      {error && (
        <div className="mt-12 text-center">
          <p className="font-display text-2xl">
            We couldn&apos;t complete that search.
          </p>
          <p className="mt-2 text-ink-muted">
            Try again or{" "}
            <Link href="/corners" className="text-accent underline">
              explore one of the corners
            </Link>
            .
          </p>
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <ol className="mt-12 space-y-8">
          {results.map((article) => (
            <li key={article.id}>
              <Link
                href={`/articles/${article.slug}`}
                className="group block border-t border-line pt-5"
              >
                <h3 className="font-display text-xl leading-snug text-ink transition-colors group-hover:text-accent">
                  {article.title}
                </h3>
                {article.dek && (
                  <p className="mt-2 text-[0.95rem] text-ink-muted">
                    {article.dek}
                  </p>
                )}
                <p className="meta-line mt-2 flex flex-wrap gap-x-2">
                  {article.corner_name && <span>{article.corner_name}</span>}
                  {article.corner_name && <span aria-hidden="true">·</span>}
                  <span>{formatReadingTime(article.reading_time_seconds)}</span>
                  {article.published_at && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {formatDate(new Date(article.published_at).getTime())}
                      </span>
                    </>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {/* §8.7 Zero state - never a dead end */}
      {searched && results && results.length === 0 && !error && (
        <div className="mt-12">
          <p className="font-display text-2xl">
            Nothing quite matched that yet.
          </p>
          <p className="mt-2 text-ink-muted">
            Try a simpler phrase, or start somewhere good:
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["feeling stuck", "learning english", "focus", "loneliness", "habits"].map(
              (s) => (
                <button
                  key={s}
                  onClick={() => {
                    setQuery(s);
                    runSearch(s);
                  }}
                  className="rounded-editorial border border-line px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-accent hover:text-ink"
                >
                  {s}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
