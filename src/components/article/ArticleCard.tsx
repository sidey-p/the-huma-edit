import Link from "next/link";
import { formatReadingTime, formatDate } from "@/lib/format";

/**
 * §2.7/§44 - ArticleCard. Calm, editorial, no SaaS-card feel (§21.4).
 */

export interface ArticleCardData {
  _id: string;
  slug: string;
  title: string;
  dek?: string | null;
  readingTimeSeconds: number;
  publishedAt?: number | null;
  contentType?: string | null;
  author?: { displayName: string; slug: string } | null;
  cornerName?: string | null;
  cornerSlug?: string | null;
}

export function ArticleCard({ article }: { article: ArticleCardData }) {
  return (
    <article className="group">
      <Link
        href={`/articles/${article.slug}`}
        className="block focus-visible:outline-none"
      >
        <h3 className="font-display text-xl leading-snug text-ink transition-colors group-hover:text-accent">
          {article.title}
        </h3>
        {article.dek && (
          <p className="mt-2 line-clamp-2 text-[0.95rem] text-ink-muted">
            {article.dek}
          </p>
        )}
        <p className="meta-line mt-3 flex flex-wrap items-center gap-x-2">
          {article.cornerName && <span>{article.cornerName}</span>}
          {article.cornerName && <span aria-hidden="true">·</span>}
          <span>{formatReadingTime(article.readingTimeSeconds)}</span>
          {article.author && (
            <>
              <span aria-hidden="true">·</span>
              <span>By {article.author.displayName}</span>
            </>
          )}
          {article.publishedAt && (
            <>
              <span aria-hidden="true">·</span>
              <time dateTime={new Date(article.publishedAt).toISOString()}>
                {formatDate(article.publishedAt)}
              </time>
            </>
          )}
        </p>
      </Link>
    </article>
  );
}
