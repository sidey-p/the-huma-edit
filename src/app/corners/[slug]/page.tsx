import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/navigation/PublicShell";
import { ArticleCard } from "@/components/article/ArticleCard";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

/** Corner detail (§5): one primary world, its published writing. */
export default async function CornerPage({
  params,
}: PageProps<"/corners/[slug]">) {
  const { slug } = await params;
  const corner = await fetchQuery(api.taxonomy.getCornerBySlug, { slug });
  if (!corner) notFound();

  const feed = await fetchQuery(api.articles.listPublished, {
    cornerSlug: slug,
    limit: 50,
  });

  // listPublished returns cards without author/corner enrichment; enrich here
  const enriched = await Promise.all(
    feed.map(async (a) => a),
  );

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-20 sm:px-6">
        <p className="meta-line">Corner</p>
        <h1 className="display-xl mt-3">{corner.name}</h1>
        {corner.description && (
          <p className="mt-5 max-w-xl text-lg text-ink-muted">
            {corner.description}
          </p>
        )}
        <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {enriched.map((a) => (
            <ArticleCard
              key={a._id}
              article={{ ...a, cornerName: corner.name, cornerSlug: corner.slug }}
            />
          ))}
        </div>
        {enriched.length === 0 && (
          <p className="mt-16 text-ink-muted">
            Nothing published here yet — the editors are writing.
          </p>
        )}
      </div>
    </PublicShell>
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/corners/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const corner = await fetchQuery(api.taxonomy.getCornerBySlug, { slug });
  if (!corner) return { title: "Not found" };
  return { title: corner.name, description: corner.description ?? undefined };
}
