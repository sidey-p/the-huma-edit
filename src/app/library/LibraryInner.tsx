"use client";

/**
 * Library (4.2, 10): saved, highlights, history, continue reading.
 * Empty states per 39 - never dead ends.
 */

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";
import { formatDate } from "@/lib/format";

type Tab = "saved" | "highlights" | "history";

export default function LibraryInner() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const saved = useQuery(api.library.listSaved, isAuthenticated ? {} : "skip");
  const highlights = useQuery(
    api.library.listMyHighlights,
    isAuthenticated ? {} : "skip",
  );
  const history = useQuery(
    api.library.listHistory,
    isAuthenticated ? {} : "skip",
  );
  const continueReading = useQuery(
    api.library.listContinueReading,
    isAuthenticated ? {} : "skip",
  );

  const [tab, setTab] = useState<Tab>("saved");

  if (isLoading) {
    return <p className="text-ink-muted">Opening your library…</p>;
  }

  if (!isAuthenticated) {
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
      {continueReading && continueReading.length > 0 && (
        <section className="mb-14">
          <h2 className="font-display text-2xl">Continue reading</h2>
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {continueReading.map((r) => (
              <li key={r._id} className="py-4">
                <Link href={`/articles/${r.slug}`} className="group block">
                  <span className="font-display text-lg text-ink transition-colors group-hover:text-accent">
                    {r.title}
                  </span>
                  <span className="meta-line mt-1 block">
                    {Math.round(r.progressPercent)}% · last read{" "}
                    {formatDate(r.lastReadAt)}
                  </span>
                  <span className="mt-2 block h-0.5 w-full rounded bg-line">
                    <span
                      className="block h-full rounded bg-accent"
                      style={{ width: `${r.progressPercent}%` }}
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
          {saved === undefined ? (
            <p className="text-ink-muted">Loading…</p>
          ) : saved.length === 0 ? (
            <EmptyLibrary
              title="Nothing saved yet."
              sub="Find something worth keeping."
            />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {saved.map((s) => (
                <li key={s._id} className="py-5">
                  <Link href={`/articles/${s.slug}`} className="group block">
                    <span className="font-display text-lg text-ink transition-colors group-hover:text-accent">
                      {s.title}
                    </span>
                    {s.dek && (
                      <span className="mt-1 block text-sm text-ink-muted">
                        {s.dek}
                      </span>
                    )}
                    <span className="meta-line mt-1 block">
                      {s.cornerName} · saved {formatDate(s.savedAt)}
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
          {highlights === undefined ? (
            <p className="text-ink-muted">Loading…</p>
          ) : highlights.length === 0 ? (
            <EmptyLibrary
              title="No passages kept yet."
              sub="Highlight the lines you want to remember."
            />
          ) : (
            <ul className="space-y-6">
              {highlights.map((h) => (
                <li key={h._id} className="border-l-2 border-accent pl-4">
                  <p className="font-display text-lg italic text-ink">
                    “{h.selectedText}”
                  </p>
                  {h.note && (
                    <p className="mt-1 text-sm text-ink-muted">{h.note}</p>
                  )}
                  <Link
                    href={`/articles/${h.articleSlug}`}
                    className="meta-line mt-1 block transition-colors hover:text-accent"
                  >
                    {h.articleTitle}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="mt-10">
          {history === undefined ? (
            <p className="text-ink-muted">Loading…</p>
          ) : history.length === 0 ? (
            <EmptyLibrary
              title="No reading history yet."
              sub="What you read lives here."
            />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {history.map((h) => (
                <li
                  key={h._id}
                  className="flex items-center justify-between py-4"
                >
                  <Link
                    href={`/articles/${h.slug}`}
                    className="font-display text-lg text-ink transition-colors hover:text-accent"
                  >
                    {h.title}
                  </Link>
                  <span className="meta-line">
                    {h.completed
                      ? "Finished"
                      : `${Math.round(h.progressPercent)}%`}
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
