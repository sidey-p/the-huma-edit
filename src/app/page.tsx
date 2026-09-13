import Link from "next/link";
import { PublicShell } from "@/components/navigation/PublicShell";
import { ArticleCard } from "@/components/article/ArticleCard";
import { CornerShowcase } from "@/components/editorial/CornerShowcase";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { formatDate } from "@/lib/format";

/** §06 Homepage: hero, The Edit, corner discovery, latest writing. */
export default async function HomePage() {
  const [feed, cornerFeatures, corners] = await Promise.all([
    fetchQuery(api.articles.listHomeFeed, { limit: 12 }),
    fetchQuery(api.articles.listCornerFeatures, {}),
    fetchQuery(api.taxonomy.listCorners, {}),
  ]);

  // §06.3 The Edit: first slot = editor's pick (composer comes Sprint 7)
  const [theEdit, ...latest] = feed;

  return (
    <PublicShell>
      {/* §06.2 Hero */}
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6">
        <p className="meta-line">By humans. For humans.</p>
        <h1 className="display-xl mt-4 max-w-3xl">
          Read something worth your time.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-muted">
          Stories, ideas, language, perspectives, and useful things — by
          humans, for humans.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/search"
            className="rounded-editorial border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-colors hover:opacity-90"
          >
            Explore what you&apos;re looking for
          </Link>
          <Link
            href="/corners"
            className="rounded-editorial border border-line px-5 py-2.5 text-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            Browse the corners
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-20 px-4 pb-24 sm:px-6">
        {/* §06.3 The Edit */}
        {theEdit && (
          <section aria-labelledby="the-edit-heading">
            <div className="flex items-baseline justify-between border-t border-line pt-12">
              <h2 id="the-edit-heading" className="display-lg">
                The Edit
              </h2>
              <p className="meta-line">Chosen, not just new</p>
            </div>
            <div className="mt-8 grid gap-10 md:grid-cols-5">
              <Link
                href={`/articles/${theEdit.slug}`}
                className="group md:col-span-3"
              >
                <p className="meta-line">
                  {theEdit.cornerName} · {formatDate(theEdit.publishedAt)}
                </p>
                <h3 className="mt-3 font-display text-3xl leading-tight text-ink transition-colors group-hover:text-accent">
                  {theEdit.title}
                </h3>
                {theEdit.dek && (
                  <p className="mt-4 text-lg text-ink-muted">{theEdit.dek}</p>
                )}
                {theEdit.author && (
                  <p className="meta-line mt-4">
                    By {theEdit.author.displayName}
                  </p>
                )}
              </Link>
              <div className="space-y-8 md:col-span-2">
                {latest.slice(0, 2).map((a) => (
                  <ArticleCard key={a._id} article={a} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* §06.4 Corner discovery */}
        <CornerShowcase
          corners={corners.map((c) => ({ ...c, description: c.description ?? null }))}
          featuredByCorner={cornerFeatures}
        />

        {/* §06.6 Latest writing */}
        <section aria-labelledby="latest-heading">
          <div className="flex items-baseline justify-between border-t border-line pt-12">
            <h2 id="latest-heading" className="display-lg">
              New writing
            </h2>
            <Link
              href="/archive"
              className="text-sm text-ink-muted transition-colors hover:text-ink"
            >
              Visit the Archive
            </Link>
          </div>
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {latest.slice(2).map((a) => (
              <ArticleCard key={a._id} article={a} />
            ))}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
