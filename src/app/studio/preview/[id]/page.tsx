import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArticleBody } from "@/components/article/ArticleBody";
import { formatReadingTime, formatDate } from "@/lib/format";
import Link from "next/link";

/**
 * §12.9 Draft preview : renders exactly as the reader will see it,
 * without publishing. Server component, RLS-gated (only the author
 * or editors can read unpublished drafts).
 */
export default async function PreviewPage({
  params,
}: PageProps<"/studio/preview/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  return (
    <div className="min-h-screen bg-paper">
      {/* editor-only chrome bar */}
      <div className="sticky top-0 z-50 border-b border-line bg-paper-raised px-4 py-2.5">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
          <p className="meta-line">
            Preview · <span className="capitalize">{data.status}</span> · not
            public
          </p>
          <Link
            href={`/studio/articles/${data.id}`}
            className="text-sm text-accent underline"
          >
            Back to editor
          </Link>
        </div>
      </div>

      {/* reader-facing article render */}
      <article
        data-reading-theme="light"
        className="mx-auto max-w-3xl bg-paper-raised px-4 pb-24 pt-14 sm:px-6"
      >
        <p className="meta-line capitalize">{data.content_type ?? "piece"}</p>
        <h1 className="display-lg mt-3">{data.title || "Untitled"}</h1>
        {data.dek && (
          <p className="mt-4 font-display text-xl italic text-ink-muted">
            {data.dek}
          </p>
        )}
        <p className="meta-line mt-5">
          {data.published_at
            ? formatDate(new Date(data.published_at).getTime())
           : "Draft"}{" "}
          · {formatReadingTime(data.reading_time_seconds)}
        </p>
        <div className="mt-10">
          <ArticleBody doc={data.content_json as never} />
        </div>
      </article>
    </div>
  );
}
