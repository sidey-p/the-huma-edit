import Link from "next/link";
import { SiteScripts } from "@/components/site/SiteScripts";

/**
 * §06.1 — Editorial masthead. Wordmark + primary nav + quiet icon
 * actions. Vocabulary: Explore, Corners, Paths, Library (§2.7).
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

          <nav className="primary-nav" aria-label="Primary">
            <Link href="/explore">Explore</Link>
            <Link href="/corners">Corners</Link>
            <Link href="/paths">Paths</Link>
            <Link href="/library">Library</Link>
          </nav>

          <div className="head-actions">
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
            {/* theme-toggle button rendered by SiteScripts */}
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
            {/* nav-toggle button rendered by SiteScripts */}
          </div>
        </div>
      </header>
    </>
  );
}
