"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useConvex } from "convex/react";
import { api } from "@convex/_generated/api";
import { formatReadingTime, formatDate } from "@/lib/format";

/**
 * §08 Explore Search - the signature feature.
 * Natural questions in, human-written articles out (§8.1).
 * Never generates an answer (§8.8).
 */

interface SearchHit {
  articleId: string;
  score: number;
  matchedTerms: string[];
}

interface ArticleLite {
  _id: string;
  slug: string;
  title: string;
  dek: string | null;
  readingTimeSeconds: number;
  publishedAt: number | null;
  cornerName?: string | null;
}

export function SearchExperience() {
  const convex = useConvex();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<{ article: ArticleLite; score: number }> | null
  >(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  const runSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      start(async () => {
        try {
          const hits: SearchHit[] = await convex.action(
            api.search.searchArticles,
            { query: trimmed, limit: 12 },
          );
          const enriched = await Promise.all(
            hits.map(
              async (h): Promise<{ article: ArticleLite; score: number } | null> => {
                const article = await convex.query(api.articles.getCardById, {
                  id: h.articleId as never,
                });
                return article ? { article, score: h.score } : null;
              },
            ),
          );
          setResults(
            enriched.filter((e): e is { article: ArticleLite; score: number } => e !== null),
          );
          setSearched(true);
          setError(false);
        } catch {
          setError(true);
        }
      });
    },
    [convex],
  );

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
          {results.map(({ article }) => (
            <li key={article._id}>
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
                  {article.cornerName && <span>{article.cornerName}</span>}
                  {article.cornerName && <span aria-hidden="true">·</span>}
                  <span>{formatReadingTime(article.readingTimeSeconds)}</span>
                  {article.publishedAt && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{formatDate(article.publishedAt)}</span>
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
