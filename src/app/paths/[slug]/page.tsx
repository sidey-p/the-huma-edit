import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/navigation/PublicShell";
import { fetchPathBySlug } from "@/lib/content";

/** §09.3 Path UX: current step, next article, ordered progress. */
export default async function PathPage({
  params,
}: PageProps<"/paths/[slug]">) {
  const { slug } = await params;
  const path = await fetchPathBySlug(slug);
  if (!path) notFound();

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-20 sm:px-6">
        <p className="meta-line">
          Reading Path · {path.totalSteps} steps · ~{path.totalMinutes} min
        </p>
        <h1 className="display-xl mt-3">{path.title}</h1>
        {path.description && (
          <p className="mt-5 max-w-xl text-lg text-ink-muted">
            {path.description}
          </p>
        )}

        <ol className="mt-14 space-y-0">
          {path.steps.map(
            (
              s: {
                _id: string;
                slug: string;
                title: string;
                intro: string | null;
                dek: string | null;
                readingTimeSeconds: number;
              },
              i: number,
            ) => (
            <li key={s._id} className="border-t border-line py-6">
              <div className="flex items-baseline gap-4">
                <span className="meta-line w-6 shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/articles/${s.slug}`}
                    className="group font-display text-xl text-ink transition-colors hover:text-accent"
                  >
                    {s.title}
                  </Link>
                  {(s.intro ?? s.dek) && (
                    <p className="mt-1 text-sm text-ink-muted">
                      {s.intro ?? s.dek}
                    </p>
                  )}
                  <p className="meta-line mt-1">
                    {Math.max(1, Math.round(s.readingTimeSeconds / 60))} min
                  </p>
                </div>
              </div>
            </li>
            ),
          )}
        </ol>

        <p className="mt-10 border-t border-line pt-6 text-sm text-ink-muted">
          Take your time. The path remembers nothing : you do.
        </p>
      </div>
    </PublicShell>
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/paths/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const path = await fetchPathBySlug(slug);
  if (!path) return { title: "Not found" };
  return { title: path.title, description: path.description ?? undefined };
}
