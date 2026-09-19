import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicShell } from "@/components/navigation/PublicShell";
import { ArticleBody } from "@/components/article/ArticleBody";
import { ArticleContents } from "@/components/article/ArticleContents";
import { SaveButton } from "@/components/reader/SaveButton";
import { ReadingControls } from "@/components/reader/ReadingControls";
import { ShareButtons } from "@/components/reader/ShareButtons";
import { TldrSummary } from "@/components/reader/TldrSummary";
import { ReadingProgressTracker } from "@/components/reader/ReadingProgressTracker";
import { Highlighter } from "@/components/reader/Highlighter";
import { BookmarkFab, ResumeAnchor } from "@/components/reader/BookmarkFab";
import { Comments } from "@/components/site/Comments";
import { fetchArticleBySlug, fetchRelated } from "@/lib/content";
import { formatReadingTime, formatDate } from "@/lib/format";

/** §7.2 article header + §7.3 reading layout. Server-rendered (§25). */
export default async function ArticlePage({
  params,
}: PageProps<"/articles/[slug]">) {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);

  if (!article) notFound();

  const related = await fetchRelated(article._id, null);
  const corner = article.corners.find((c) => c) ?? null;

  // §29 SEO: JSON-LD structured data for rich article results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.seo_description ?? article.dek ?? undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: article.author
      ? {
          "@type": "Person",
          name: article.author.displayName,
          ...(article.author.slug
            ? { url: `/authors/${article.author.slug}` }
           : {}),
        }
     : undefined,
    publisher: { "@type": "Organization", name: "The Human Edit" },
    isAccessibleForFree: true,
    inLanguage: "en",
  };

  return (
    <PublicShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReadingProgressTracker articleId={article._id} />
      <ResumeAnchor />
      <BookmarkFab articleId={article._id} />
      <article data-reading-theme="light" className="w-full bg-paper-raised">
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
          {/* Topic chips : open the topic's related articles (§5.7) */}
          {article.topics.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {article.topics.map((t) => (
                <Link key={t.id} href={`/topics/${t.slug}`} className="chip">
                  {t.name}
                </Link>
              ))}
            </div>
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
              <time dateTime={article.published_at ?? undefined}>
                {article.published_at
                  ? formatDate(new Date(article.published_at).getTime())
                 : ""}
              </time>
              <span aria-hidden="true">·</span>
              <span>{formatReadingTime(article.reading_time_seconds)}</span>
              {article.content_type && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">
                    {article.content_type.replace("_", " ")}
                  </span>
                </>
              )}
            </div>
            {/* 7.4 persistent but quiet reading controls */}
            <div className="flex items-center gap-3">
              <ShareButtons title={article.title} slug={article.slug} dek={article.dek} />
              <ReadingControls />
              <SaveButton articleId={article._id} />
            </div>
          </div>
        </header>

        {/* 7.3 Reading layout + 7.7 margin-rail TOC */}
        <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-12">
            <div className="mx-auto max-w-3xl min-w-0">
              {article.dek && <TldrSummary text={article.dek} />}

              <ArticleBody
                doc={article.content_json as never}
                ads={article.ads}
                links={article.editorialLinks}
                words={article.wordsToNotice}
              />

              <Highlighter articleId={article._id} />

            {/* §18.2 Words to notice : vocabulary from this article */}
            {article.wordsToNotice.length > 0 && (
              <aside
                aria-labelledby="words-to-notice"
                className="mt-16 border-t border-line pt-8"
              >
                <h2
                  id="words-to-notice"
                  className="meta-line font-medium"
                  style={{ color: "var(--gold)" }}
                >
                  Words to notice
                </h2>
                <ul className="mt-4 space-y-4">
                  {article.wordsToNotice.map((w) => (
                    <li key={w._id}>
                      <Link
                        href="/english/vocabulary"
                        className="group flex flex-wrap items-baseline gap-x-2"
                      >
                        <span className="font-display text-lg transition-colors group-hover:text-accent">
                          {w.word}
                        </span>
                        {w.partOfSpeech && (
                          <span className="meta-line italic">
                            {w.partOfSpeech}
                          </span>
                        )}
                        <span className="text-sm text-ink-muted">
                          - {w.plainMeaning}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="meta-line mt-5">
                  <Link href="/english/vocabulary" className="ink-link">
                    More words worth keeping →
                  </Link>
                </p>
              </aside>
            )}

            <Comments articleId={article._id} />
            </div>
            <ArticleContents />
          </div>
        </div>

        {/* 7.9 End-of-article: continue exploring, never a dead grid */}
        {related.length === 0 ? (
          <section className="mx-auto max-w-3xl border-t border-line px-4 py-16 text-center sm:px-6">
            <p className="meta-line">Keep reading</p>
            <Link
              href={corner ? `/corners/${corner.slug}` : "/corners"}
              className="mt-3 inline-block font-display text-2xl text-ink underline decoration-line decoration-1 underline-offset-4 hover:text-accent"
            >
              Explore more from this corner
            </Link>
          </section>
        ) : (
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
        )}
      </article>
    </PublicShell>
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
    description: article.seo_description ?? article.dek ?? undefined,
    alternates: { canonical: `/articles/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.seo_description ?? article.dek ?? undefined,
      type: "article",
      publishedTime: article.published_at ?? undefined,
      authors: article.author
        ? [`/authors/${article.author.slug ?? ""}`]
       : undefined,
      siteName: "The Human Edit",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.seo_description ?? article.dek ?? undefined,
    },
  };
}
