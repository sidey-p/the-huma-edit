import Link from "next/link";

/**
 * §06.7 — Footer with About, policies, and Archive.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-top">
          <div>
            <div className="footer-wordmark">The Human Edit</div>
            <p className="footer-tag">By humans. For humans.</p>
          </div>
          <div className="footer-cols">
            <div>
              <h5>Publication</h5>
              <ul>
                <li><Link href="/about">About</Link></li>
                <li><Link href="/archive">Archive</Link></li>
                <li><Link href="/corners">Corners</Link></li>
                <li><Link href="/authors">Authors</Link></li>
              </ul>
            </div>
            <div>
              <h5>Principles</h5>
              <ul>
                <li><Link href="/editorial-policy">Editorial policy</Link></li>
                <li><Link href="/human-authorship">Human authorship</Link></li>
              </ul>
            </div>
            <div>
              <h5>Reader</h5>
              <ul>
                <li><Link href="/library">Library</Link></li>
                <li><Link href="/paths">Reading paths</Link></li>
                <li><Link href="/settings">Settings</Link></li>
              </ul>
            </div>
            <div>
              <h5>Legal</h5>
              <ul>
                <li><Link href="/privacy">Privacy</Link></li>
                <li><Link href="/terms">Terms</Link></li>
                <li><Link href="/accessibility">Accessibility</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 The Human Edit.</span>
          <span>Every word on this site was written by a person.</span>
        </div>
      </div>
    </footer>
  );
}
