import type { Metadata } from "next";
import { PublicShell } from "@/components/navigation/PublicShell";
import { ArticleCard } from "@/components/article/ArticleCard";
import { fetchHomeFeed } from "@/lib/content";

/** Archive (§2.7): the complete published body. */
export default async function ArchivePage() {
  const feed = await fetchHomeFeed(100);

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-20 sm:px-6">
        <h1 className="display-xl">Archive</h1>
        <p className="mt-4 max-w-xl text-lg text-ink-muted">
          Every piece published in The Human Edit, newest first.
        </p>
        <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {feed.map((a) => (
            <ArticleCard
              key={a.id}
              article={{
                _id: a.id,
                slug: a.slug,
                title: a.title,
                dek: a.dek,
                readingTimeSeconds: a.reading_time_seconds,
                publishedAt: a.published_at
                  ? new Date(a.published_at).getTime()
                 : null,
                contentType: a.content_type,
                cornerName: a.cornerName,
                cornerSlug: a.cornerSlug,
                author: a.author,
              }}
            />
          ))}
        </div>
      </div>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "Archive",
  description: "The complete published body of The Human Edit.",
};
