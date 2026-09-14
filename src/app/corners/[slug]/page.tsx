import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/navigation/PublicShell";
import { ArticleCard } from "@/components/article/ArticleCard";
import { FollowButton } from "@/components/site/FollowButton";
import { fetchCornerBySlug, fetchPublished } from "@/lib/content";

/** Corner detail (§5): one primary world, its published writing. */
export default async function CornerPage({
  params,
}: PageProps<"/corners/[slug]">) {
  const { slug } = await params;
  const corner = await fetchCornerBySlug(slug);
  if (!corner) notFound();

  const feed = await fetchPublished({ cornerSlug: slug, limit: 50 });

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-20 sm:px-6">
        <p className="meta-line">Corner</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="display-xl">{corner.name}</h1>
          <FollowButton cornerId={corner._id} />
        </div>
        {corner.description && (
          <p className="mt-5 max-w-xl text-lg text-ink-muted">
            {corner.description}
          </p>
        )}
        <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {feed.map((a) => (
            <ArticleCard
              key={a._id}
              article={{
                _id: a._id,
                slug: a.slug,
                title: a.title,
                dek: a.dek,
                readingTimeSeconds: a.reading_time_seconds,
                publishedAt: a.published_at
                  ? new Date(a.published_at).getTime()
                 : null,
                contentType: a.content_type,
                cornerName: corner.name,
                cornerSlug: corner.slug,
              }}
            />
          ))}
        </div>
        {feed.length === 0 && (
          <p className="mt-16 text-ink-muted">
            Nothing published here yet : the editors are writing.
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
  const corner = await fetchCornerBySlug(slug);
  if (!corner) return { title: "Not found" };
  return { title: corner.name, description: corner.description ?? undefined };
}
