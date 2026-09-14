import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/navigation/PublicShell";
import { fetchPaths } from "@/lib/content";

/** §09 Reading Paths index : guided journeys through the archive. */
export default async function PathsPage() {
  const paths = await fetchPaths();

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-20 sm:px-6">
        <h1 className="display-xl">Reading Paths</h1>
        <p className="mt-4 max-w-xl text-lg text-ink-muted">
          Guided journeys through the archive. Start at step one and keep
          going.
        </p>
        <div className="mt-16 grid gap-12 md:grid-cols-2">
          {paths.map((p) => (
            <Link
              key={p._id}
              href={`/paths/${p.slug}`}
              className="group border-t border-line pt-6"
            >
              <p className="meta-line">
                {p.totalSteps} steps · ~{p.totalMinutes} min
              </p>
              <h2 className="mt-3 font-display text-2xl text-ink transition-colors group-hover:text-accent">
                {p.title}
              </h2>
              {p.description && (
                <p className="mt-2 text-ink-muted">{p.description}</p>
              )}
              <ol className="mt-4 space-y-1.5">
                {p.steps.slice(0, 5).map(
                  (s: { _id: string; title: string }, i: number) => (
                    <li key={s._id} className="meta-line">
                      {i + 1}. {s.title}
                    </li>
                  ),
                )}
              </ol>
            </Link>
          ))}
        </div>
        {paths.length === 0 && (
          <p className="mt-16 text-ink-muted">
            No paths published yet. The editors are charting them.
          </p>
        )}
      </div>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "Reading Paths",
  description: "Guided journeys through The Human Edit archive.",
};

