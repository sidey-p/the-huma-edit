import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/navigation/PublicShell";
import { ArticleCard } from "@/components/article/ArticleCard";
import { CornerShowcase } from "@/components/editorial/CornerShowcase";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

/** §4.1 /explore — discovery hub: corners, paths, latest. */
export default async function ExplorePage() {
  const [feed, corners, features, paths] = await Promise.all([
    fetchQuery(api.articles.listHomeFeed, { limit: 18 }),
    fetchQuery(api.taxonomy.listCorners, {}),
    fetchQuery(api.articles.listCornerFeatures, {}),
    fetchQuery(api.paths.listPublishedPaths, {}),
  ]);

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl space-y-20 px-4 pb-24 pt-20 sm:px-6">
        <section>
          <h1 className="display-xl">Explore</h1>
          <p className="mt-4 max-w-xl text-lg text-ink-muted">
            Six corners, guided paths, and everything new — or{" "}
            <Link href="/search" className="text-accent underline">
              ask for something specific
            </Link>
            .
          </p>
        </section>

        <CornerShowcase
          corners={corners.map((c) => ({ ...c, description: c.description ?? null }))}
          featuredByCorner={features}
        />

        {paths.length > 0 && (
          <section aria-labelledby="paths-heading">
            <h2 id="paths-heading" className="display-lg">
              Reading Paths
            </h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              {paths.map((p) => (
                <Link
                  key={p._id}
                  href={`/paths/${p.slug}`}
                  className="group border-t border-line pt-5"
                >
                  <p className="meta-line">
                    {p.totalSteps} steps · ~{p.totalMinutes} min
                  </p>
                  <h3 className="mt-2 font-display text-xl text-ink transition-colors group-hover:text-accent">
                    {p.title}
                  </h3>
                  {p.description && (
                    <p className="mt-1 text-sm text-ink-muted">
                      {p.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="latest-heading">
          <h2 id="latest-heading" className="display-lg">
            Everything new
          </h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {feed.map((a) => (
              <ArticleCard key={a._id} article={a} />
            ))}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "Explore",
  description: "Discover something worth reading in The Human Edit.",
};
