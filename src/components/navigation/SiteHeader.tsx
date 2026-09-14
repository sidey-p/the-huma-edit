import Link from "next/link";
import { SiteScripts, ThemeToggle, MobileNav } from "@/components/site/SiteScripts";
import { NotificationCenter } from "@/components/site/NotificationCenter";
import { BookmarkMenu } from "@/components/site/BookmarkMenu";
import { AuthIndicator } from "@/components/site/AuthIndicator";

/**
 * §06.1 Editorial masthead: wordmark + nav + quiet icon actions.
 * Icons right-aligned; hamburger + its panel only below 640px.
 */
export function SiteHeader() {
  return (
    <>
      <SiteScripts />
      <header className="masthead">
        <div className="wrap masthead-row">
          <Link href="/" className="wordmark">
            The Human Edit
            <small>BY HUMANS. FOR HUMANS.</small>
          </Link>

          {/* Desktop nav (hidden on phones; hamburger panel takes over) */}
          <nav className="primary-nav" aria-label="Primary">
            <Link href="/explore">Explore</Link>
            <Link href="/corners">Corners</Link>
            <Link href="/paths">Paths</Link>
            <Link href="/library">Library</Link>
          </nav>

          <div className="head-actions">
            <AuthIndicator />
            <Link
              href="/search"
              className="icon-btn"
              aria-label="Explore Search"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.6" y2="16.6" />
              </svg>
            </Link>
            <NotificationCenter />
            <BookmarkMenu />
            <ThemeToggle />
            <Link href="/settings" className="icon-btn" aria-label="Account">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="3.4" />
                <path d="M4.5 20c1.4-3.4 4.2-5.2 7.5-5.2s6.1 1.8 7.5 5.2" />
              </svg>
            </Link>
            <MobileNav />
          </div>
        </div>
      </header>
    </>
  );
}
