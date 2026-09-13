import Link from "next/link";

/**
 * §06.7 — Footer with About, policies, and Archive.
 */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <p className="brand-statement text-sm text-ink">
          The Human Edit
        </p>
        <p className="meta-line mt-2">By humans. For humans.</p>

        <div className="mt-8 grid grid-cols-2 gap-8 text-sm sm:grid-cols-4">
          <FooterColumn title="Publication">
            <FooterLink href="/about">About</FooterLink>
            <FooterLink href="/archive">Archive</FooterLink>
            <FooterLink href="/corners">Corners</FooterLink>
            <FooterLink href="/authors">Authors</FooterLink>
          </FooterColumn>
          <FooterColumn title="Principles">
            <FooterLink href="/editorial-policy">Editorial policy</FooterLink>
            <FooterLink href="/human-authorship">Human authorship</FooterLink>
          </FooterColumn>
          <FooterColumn title="Reader">
            <FooterLink href="/library">Library</FooterLink>
            <FooterLink href="/paths">Reading Paths</FooterLink>
            <FooterLink href="/settings">Settings</FooterLink>
          </FooterColumn>
          <FooterColumn title="Legal">
            <FooterLink href="/privacy">Privacy</FooterLink>
            <FooterLink href="/terms">Terms</FooterLink>
            <FooterLink href="/accessibility">Accessibility</FooterLink>
          </FooterColumn>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="meta-line mb-3 font-medium">{title}</h2>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-ink-muted transition-colors hover:text-ink"
      >
        {children}
      </Link>
    </li>
  );
}
