import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/navigation/PublicShell";
import { ArticleCard } from "@/components/article/ArticleCard";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

/** Author profile (§11.2): make the person visible, not just the byline. */
export default async function AuthorPage({
  params,
}: PageProps<"/authors/[slug]">) {
  const { slug } = await params;
  const author = await fetchQuery(api.authors.getBySlug, { slug });
  if (!author) notFound();

  const works = await fetchQuery(api.authors.listPublishedWorks, {
    authorId: author._id,
  });

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-20 sm:px-6">
        {/* §11.1 Public author profile */}
        <header className="border-b border-line pb-10">
          <h1 className="display-lg">{author.displayName}</h1>
          {author.shortBio && (
            <p className="mt-4 max-w-xl text-lg text-ink-muted">
              {author.shortBio}
            </p>
          )}
          {author.authorStatement && (
            <p className="mt-6 border-l-2 border-accent pl-5 font-display text-lg italic text-ink">
              {author.authorStatement}
            </p>
          )}
          <div className="meta-line mt-6 flex flex-wrap items-center gap-x-3">
            <span>
              {works.length} {works.length === 1 ? "piece" : "pieces"} published
            </span>
            {author.isGhost && <span>· Guest author</span>}
          </div>
        </header>

        {/* §11.1 selected pieces + archive */}
        <section className="mt-12 space-y-8">
          {works.map((w) => (
            <ArticleCard key={w._id} article={w} />
          ))}
          {works.length === 0 && (
            <p className="text-ink-muted">No published pieces yet.</p>
          )}
        </section>
      </div>
    </PublicShell>
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/authors/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const author = await fetchQuery(api.authors.getBySlug, { slug });
  if (!author) return { title: "Not found" };
  return {
    title: author.displayName,
    description: author.shortBio ?? undefined,
  };
}
