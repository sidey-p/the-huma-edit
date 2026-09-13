import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/navigation/PublicShell";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

/** §05 Corners index. */
export default async function CornersPage() {
  const [corners, features] = await Promise.all([
    fetchQuery(api.taxonomy.listCorners, {}),
    fetchQuery(api.articles.listCornerFeatures, {}),
  ]);

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-20 sm:px-6">
        <h1 className="display-xl">Corners</h1>
        <p className="mt-4 max-w-xl text-lg text-ink-muted">
          Six worlds of reading. Find the one you&apos;re in the mood for.
        </p>
        <div className="mt-14 space-y-12">
          {corners.map((corner) => (
            <section
              key={corner._id}
              className="group border-t border-line pt-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/corners/${corner.slug}`}>
                  <h2 className="font-display text-2xl text-ink transition-colors group-hover:text-accent">
                    {corner.name}
                  </h2>
                </Link>
                {features[corner.slug] && (
                  <Link
                    href={`/articles/${features[corner.slug]!.slug}`}
                    className="meta-line transition-colors hover:text-accent"
                  >
                    Start with: {features[corner.slug]!.title}
                  </Link>
                )}
              </div>
              {corner.description && (
                <p className="mt-2 max-w-2xl text-ink-muted">
                  {corner.description}
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "Corners",
  description: "Six worlds of reading in The Human Edit.",
};
