import Link from "next/link";

/**
 * §06.1 — Compact editorial header. Avoid a huge persistent nav bar.
 * Vocabulary: Explore, Corners, Paths, Library (§2.7).
 */
export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-display text-lg font-medium tracking-tight"
          >
            The Human Edit
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-5 md:flex">
            <HeaderLink href="/explore">Explore</HeaderLink>
            <HeaderLink href="/corners">Corners</HeaderLink>
            <HeaderLink href="/paths">Paths</HeaderLink>
            <HeaderLink href="/library">Library</HeaderLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <SearchTrigger />
          <Link
            href="/settings"
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Account
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeaderLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="text-sm text-ink-muted transition-colors hover:text-ink"
    >
      {children}
    </Link>
  );
}

function SearchTrigger() {
  return (
    <Link
      href="/search"
      aria-label="Explore Search"
      className="flex items-center gap-2 rounded-editorial border border-line px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span className="hidden sm:inline">Ask naturally</span>
    </Link>
  );
}
