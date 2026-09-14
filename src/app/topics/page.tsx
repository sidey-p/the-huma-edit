import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/navigation/PublicShell";
import { fetchTopics } from "@/lib/content";

/** Topics index : every thread in the fabric. */
export default async function TopicsPage() {
  const topics = await fetchTopics();

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-20 sm:px-6">
        <h1 className="display-xl">Topics</h1>
        <p className="mt-4 max-w-xl text-lg text-ink-muted">
          Every thread in the fabric. Follow one and see where it leads.
        </p>
        <div className="mt-12 flex flex-wrap gap-2.5">
          {topics.map((t) => (
            <Link key={t.id} href={`/topics/${t.slug}`} className="chip">
              {t.name}
              {t.count > 0 && (
                <span className="ml-1.5 text-ink-faint">{t.count}</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "Topics",
  description: "Every topic thread in The Human Edit.",
};
