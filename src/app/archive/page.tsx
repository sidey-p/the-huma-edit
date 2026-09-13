import type { Metadata } from "next";
import { PublicShell } from "@/components/navigation/PublicShell";
import { ArticleCard } from "@/components/article/ArticleCard";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

/** Archive (§2.7): the complete published body. */
export default async function ArchivePage() {
  const feed = await fetchQuery(api.articles.listHomeFeed, { limit: 100 });

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-20 sm:px-6">
        <h1 className="display-xl">Archive</h1>
        <p className="mt-4 max-w-xl text-lg text-ink-muted">
          Every piece published in The Human Edit, newest first.
        </p>
        <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {feed.map((a) => (
            <ArticleCard key={a._id} article={a} />
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
