"use client";

/**
 * Desk home (§12.2): Today - drafts, review queue, scheduled.
 */

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export function DeskHome() {
  const desk = useQuery(api.articles.listDesk, {});

  if (desk === undefined) {
    return <p className="text-ink-muted">Opening the desk…</p>;
  }

  return (
    <div className="space-y-12">
      {/* Writing (§12.2) */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">Continue writing</h2>
          <Link href="/studio/write" className="text-sm text-accent underline">
            New article
          </Link>
        </div>
        {desk.drafts.length === 0 ? (
          <p className="mt-4 text-ink-muted">
            No drafts in progress. Start something worth reading.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {desk.drafts.map((d) => (
              <li key={d._id} className="flex items-center justify-between py-3">
                <Link
                  href={`/studio/articles/${d._id}`}
                  className="group flex flex-col"
                >
                  <span className="font-display text-lg text-ink transition-colors group-hover:text-accent">
                    {d.title || "Untitled"}
                  </span>
                  <span className="meta-line capitalize">
                    {d.status === "needs_changes" ? "needs changes" : d.status} ·{" "}
                    {d.wordCount} words
                  </span>
                </Link>
                <Link
                  href={`/studio/articles/${d._id}`}
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Editorial (§12.2) */}
      {desk.reviewQueue.length > 0 && (
        <section>
          <h2 className="font-display text-2xl">Review queue</h2>
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {desk.reviewQueue.map((d) => (
              <li key={d._id} className="flex items-center justify-between py-3">
                <Link href={`/studio/articles/${d._id}`} className="group">
                  <span className="font-display text-lg text-ink transition-colors group-hover:text-accent">
                    {d.title || "Untitled"}
                  </span>
                  <span className="meta-line ml-3">in review</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {desk.scheduled.length > 0 && (
        <section>
          <h2 className="font-display text-2xl">Scheduled</h2>
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {desk.scheduled.map((d) => (
              <li key={d._id} className="py-3">
                <Link
                  href={`/studio/articles/${d._id}`}
                  className="font-display text-lg text-ink transition-colors hover:text-accent"
                >
                  {d.title || "Untitled"}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
