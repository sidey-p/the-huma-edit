import Link from "next/link";
import { PublicShell } from "@/components/navigation/PublicShell";

/** §39: missing pieces keep their editorial tone. */
export default function NotFound() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-32 text-center sm:px-6">
        <p className="font-display text-4xl">
          This piece has left the shelves.
        </p>
        <p className="mt-4 text-lg text-ink-muted">
          Explore the archive instead.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/archive"
            className="rounded-editorial border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink"
          >
            Visit the Archive
          </Link>
          <Link
            href="/search"
            className="rounded-editorial border border-line px-5 py-2.5 text-sm text-ink-muted hover:border-line-strong hover:text-ink"
          >
            Search for something
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
