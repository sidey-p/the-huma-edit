import Link from "next/link";
import "../globals.css";
import "./globals.css";

/**
 * Edit Studio shell (§12): dense, keyboard-first, information-rich.
 * Editor nav: Desk, Write, Corners, Homepage, Alerts, Preview drafts.
 */
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper">
      <nav
        className="sticky top-0 z-50 border-b border-line bg-paper-raised"
        aria-label="Studio"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5">
          <Link
            href="/studio"
            className="font-display text-base font-semibold text-ink"
          >
            Edit Studio
          </Link>
          <Link href="/studio" className="meta-line transition-colors hover:text-ink">
            Desk
          </Link>
          <Link href="/studio/write" className="meta-line transition-colors hover:text-ink">
            Write
          </Link>
          <Link href="/studio/corners" className="meta-line transition-colors hover:text-ink">
            Corners
          </Link>
          <Link href="/studio/topics" className="meta-line transition-colors hover:text-ink">
            Topics
          </Link>
          <Link href="/studio/homepage" className="meta-line transition-colors hover:text-ink">
            Homepage
          </Link>
          <Link href="/studio/ads" className="meta-line transition-colors hover:text-ink">
            Ads
          </Link>
          <Link href="/studio/alerts" className="meta-line transition-colors hover:text-ink">
            Alerts
          </Link>
          <span className="flex-1" />
          <Link
            href="/"
            className="meta-line transition-colors hover:text-ink"
            target="_blank"
          >
            View site ↗
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
