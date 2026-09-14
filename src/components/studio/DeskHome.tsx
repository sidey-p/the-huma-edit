"use client";

/**
 * Desk home (§12.2): Today - drafts, review queue, scheduled.
 * Server-side queries filtered by RLS (only staff pass article read policy).
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type DeskArticle = {
  id: string;
  slug: string;
  title: string;
  status: string;
  word_count: number;
  updated_at: string;
};

export function DeskHome() {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [drafts, setDrafts] = useState<DeskArticle[]>([]);
  const [reviewQueue, setReviewQueue] = useState<DeskArticle[]>([]);
  const [scheduled, setScheduled] = useState<DeskArticle[]>([]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setDenied(true);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("articles")
        .select("id, slug, title, status, word_count, updated_at")
        .neq("status", "published")
        .neq("status", "archived")
        .order("updated_at", { ascending: false })
        .limit(30);

      if (error) {
        setDenied(true);
      } else {
        const all = (data ?? []) as DeskArticle[];
        setDrafts(all.filter((a) => a.status === "draft" || a.status === "needs_changes"));
        setReviewQueue(all.filter((a) => a.status === "in_review"));
        setScheduled(all.filter((a) => a.status === "scheduled" || a.status === "approved"));
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-ink-muted">Opening the desk…</p>;

  if (denied) {
    return (
      <div className="py-8">
        <p className="font-display text-2xl">Editor access required.</p>
        <p className="mt-2 text-ink-muted">
          The Desk is for authors and editors.{" "}
          <Link href="/sign-in" className="text-accent underline">
            Sign in
          </Link>{" "}
          with a staff account.
        </p>
      </div>
    );
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
        {drafts.length === 0 ? (
          <p className="mt-4 text-ink-muted">
            No drafts in progress. Start something worth reading.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {drafts.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-3">
                <Link href={`/studio/articles/${d.id}`} className="group flex flex-col">
                  <span className="font-display text-lg text-ink transition-colors group-hover:text-accent">
                    {d.title || "Untitled"}
                  </span>
                  <span className="meta-line capitalize">
                    {d.status === "needs_changes" ? "needs changes" : d.status} ·{" "}
                    {d.word_count} words
                  </span>
                </Link>
                <Link
                  href={`/studio/articles/${d.id}`}
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
      {reviewQueue.length > 0 && (
        <section>
          <h2 className="font-display text-2xl">Review queue</h2>
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {reviewQueue.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-3">
                <Link href={`/studio/articles/${d.id}`} className="group">
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

      {scheduled.length > 0 && (
        <section>
          <h2 className="font-display text-2xl">Scheduled</h2>
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {scheduled.map((d) => (
              <li key={d.id} className="py-3">
                <Link
                  href={`/studio/articles/${d.id}`}
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
