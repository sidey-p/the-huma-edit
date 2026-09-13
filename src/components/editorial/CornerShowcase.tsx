import Link from "next/link";

/**
 * §06.4 - Corner discovery. Editorial composition, not uniform SaaS cards:
 * title, description, featured story slot, visual motif per corner.
 */

export interface CornerData {
  _id: string;
  slug: string;
  name: string;
  description: string | null;
}

export function CornerShowcase({
  corners,
  featuredByCorner,
}: {
  corners: CornerData[];
  featuredByCorner: Record<string, { title: string; slug: string } | undefined>;
}) {
  return (
    <section aria-labelledby="corners-heading" className="border-t border-line pt-12">
      <div className="flex items-baseline justify-between">
        <h2 id="corners-heading" className="display-lg">
          Corners
        </h2>
        <Link
          href="/corners"
          className="text-sm text-ink-muted transition-colors hover:text-ink"
        >
          All corners
        </Link>
      </div>
      <div className="mt-8 grid gap-10 md:grid-cols-2">
        {corners.map((corner) => {
          const featured = featuredByCorner[corner.slug];
          return (
            <section key={corner._id} className="group border-t border-line pt-5">
              <Link href={`/corners/${corner.slug}`} className="block">
                <h3 className="font-display text-lg text-ink transition-colors group-hover:text-accent">
                  {corner.name}
                </h3>
                {corner.description && (
                  <p className="mt-1 text-sm text-ink-muted">
                    {corner.description}
                  </p>
                )}
              </Link>
              {featured && (
                <Link
                  href={`/articles/${featured.slug}`}
                  className="meta-line mt-3 block transition-colors hover:text-accent"
                >
                  <span className="text-ink-faint">Read: </span>
                  {featured.title}
                </Link>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
