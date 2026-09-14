import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/navigation/PublicShell";
import { ArticleCard } from "@/components/article/ArticleCard";
import { fetchTopicBySlug } from "@/lib/content";

/** One topic and its articles (§5.7 : never one bucket per idea). */
export default async function TopicPage({
  params,
}: PageProps<"/topics/[slug]">) {
  const { slug } = await params;
  const topic = await fetchTopicBySlug(slug);
  if (!topic) notFound();

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-20 sm:px-6">
        <p className="meta-line">Topic</p>
        <h1 className="display-xl mt-3 capitalize">{topic.name}</h1>
        {topic.description && (
          <p className="mt-5 max-w-xl text-lg text-ink-muted">
            {topic.description}
          </p>
        )}
        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {topic.articles.map((a) => (
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
              }}
            />
          ))}
        </div>
        {topic.articles.length === 0 && (
          <p className="mt-14 text-ink-muted">
            Nothing here yet : the editors are writing.
          </p>
        )}
      </div>
    </PublicShell>
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/topics/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const topic = await fetchTopicBySlug(slug);
  if (!topic) return { title: "Not found" };
  return {
    title: topic.name,
    description: topic.description ?? `Pieces about ${topic.name}.`,
  };
}
