import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { PublicShell } from "@/components/navigation/PublicShell";
import { ArticleBody } from "@/components/article/ArticleBody";
import { ArticleContents } from "@/components/article/ArticleContents";
import { SaveButton } from "@/components/reader/SaveButton";
import { ReadingControls } from "@/components/reader/ReadingControls";
import { ReadingProgressTracker } from "@/components/reader/ReadingProgressTracker";
import { fetchArticleBySlug } from "@/lib/content";
import { formatReadingTime, formatDate } from "@/lib/format";

/** §7.2 article header + §7.3 reading layout. Server-rendered (§25). */
export default async function ArticlePage({
  params,
}: PageProps<"/articles/[slug]">) {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);

  if (!article) notFound();

  const corner = article.corners.find((c) => c) ?? null;
  const ogImage = undefined; // cover assets come with Sprint 2 media

  return (
    <PublicShell>
      <ReadingProgressTracker articleId={article._id} />
      <article data-reading-theme="light" className="w-full bg-white">
        {/* 7.2 Article header */}
        <header className="mx-auto max-w-3xl px-4 pb-10 pt-16 sm:px-6">
          {corner && (
            <Link
              href={`/corners/${corner.slug}`}
              className="meta-line transition-colors hover:text-ink"
            >
              {corner.name}
            </Link>
          )}
          <h1 className="display-lg mt-4">{article.title}</h1>
          {article.dek && (
            <p className="mt-4 font-display text-xl italic text-ink-muted">
              {article.dek}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="meta-line flex flex-wrap items-center gap-x-3 gap-y-1">
              {article.author && (
                <span>
                  By{" "}
                  {article.author.slug ? (
                    <Link
                      href={`/authors/${article.author.slug}`}
                      className="text-ink transition-colors hover:text-accent"
                    >
                      {article.author.displayName}
                    </Link>
                  ) : (
                    article.author.displayName
                  )}
                </span>
              )}
              <span aria-hidden="true">·</span>
              <time dateTime={new Date(article.publishedAt ?? 0).toISOString()}>
                {formatDate(article.publishedAt)}
              </time>
              <span aria-hidden="true">·</span>
              <span>{formatReadingTime(article.readingTimeSeconds)}</span>
              {article.contentType && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{article.contentType}</span>
                </>
              )}
            </div>
            {/* 7.4 persistent but quiet reading controls */}
            <div className="flex items-center gap-3">
              <ReadingControls />
              <SaveButton articleId={article._id} />
            </div>
          </div>
        </header>

        {/* 7.3 Reading layout + 7.7 margin-rail TOC */}
        <div className="mx-auto flex max-w-5xl gap-12 px-4 pb-24 sm:px-6">
          <div className="mx-auto max-w-3xl min-w-0">
            <ArticleBody doc={article.contentJson as never} />
          </div>
          <ArticleContents />
        </div>

        {/* 7.9 End-of-article: continue exploring, never a dead grid */}
        <EndOfArticle articleId={article._id} cornerSlug={corner?.slug ?? null} />
      </article>
    </PublicShell>
  );
}

/** 7.9: related pieces with reasons (17.3 explainability). */
async function EndOfArticle({
  articleId,
  cornerSlug,
}: {
  articleId: string;
  cornerSlug: string | null;
}) {
  const related = await fetchQuery(api.paths.listRelated, {
    articleId: articleId as never,
    limit: 3,
  });

  if (related.length === 0) {
    return (
      <section className="mx-auto max-w-3xl border-t border-line px-4 py-16 text-center sm:px-6">
        <p className="meta-line">Keep reading</p>
        <Link
          href={cornerSlug ? `/corners/${cornerSlug}` : "/corners"}
          className="mt-3 inline-block font-display text-2xl text-ink underline decoration-line decoration-1 underline-offset-4 hover:text-accent"
        >
          Explore more from this corner
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl border-t border-line px-4 py-16 sm:px-6">
      <p className="meta-line">Keep reading</p>
      <div className="mt-6 grid gap-10 sm:grid-cols-3">
        {related.map((r) => (
          <Link key={r._id} href={`/articles/${r.slug}`} className="group">
            <p className="meta-line text-accent">{r.reason}</p>
            <h3 className="mt-2 font-display text-lg leading-snug text-ink transition-colors group-hover:text-accent">
              {r.title}
            </h3>
            {r.dek && (
              <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{r.dek}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/articles/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);
  if (!article) return { title: "Not found" };
  return {
    title: article.title,
    description: article.seoDescription ?? article.dek ?? undefined,
    alternates: { canonical: `/articles/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.seoDescription ?? article.dek ?? undefined,
      type: "article",
      publishedTime: article.publishedAt
        ? new Date(article.publishedAt).toISOString()
        : undefined,
    },
  };
}
