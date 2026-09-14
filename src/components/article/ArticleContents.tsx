"use client";

/**
 * Article contents (7.7): scroll-aware TOC for long articles.
 * Desktop: sticky sidebar. Mobile/tablet: collapsible summary at top.
 * Rendered once inside the flex layout; CSS controls visibility per breakpoint.
 */

import { useEffect, useState } from "react";

export function ArticleContents() {
  const [heads, setHeads] = useState<
    Array<{ id: string; text: string; level: number }>
  >([]);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const found: Array<{ id: string; text: string; level: number }> = [];
    document
      .querySelectorAll<HTMLElement>(".article-body h2, .article-body h3")
      .forEach((h) => {
        if (!h.id) {
          h.id = h.textContent
            ? h.textContent
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "")
                .trim()
                .replace(/\s+/g, "-")
            : `h-${found.length}`;
        }
        found.push({
          id: h.id,
          text: h.textContent ?? "",
          level: Number(h.tagName.slice(1)),
        });
      });
    const t = setTimeout(() => {
      setHeads(found);
      if (found.length >= 3) setOpen(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (heads.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    heads.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [heads]);

  if (heads.length < 2) return null;

  return (
    <nav
      aria-label="Article contents"
      className={
        /* mobile: full-width block at top. Desktop: sticky sidebar */
        "shrink-0 overflow-y-auto " +
        "max-h-[70vh] " +
        /* mobile/tablet: block, full-width */
        "block w-full mb-8 border border-line rounded-editorial px-4 py-3 " +
        /* desktop: sticky sidebar, narrow, no border */
        "lg:sticky lg:top-20 lg:w-52 lg:max-h-[70vh] lg:border-0 lg:px-0 lg:py-0 lg:mb-0 lg:ml-auto"
      }
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="meta-line font-medium w-full text-left"
      >
        {open ? "Contents -" : "Contents +"}
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 border-t border-line pt-2 lg:border-t-0 lg:pt-0 lg:border-l lg:border-line lg:pl-3 lg:mt-3 lg:space-y-2">
          {heads.map((h) => (
            <li key={h.id} style={{ paddingLeft: (h.level - 2) * 0.75 }}>
              <a
                href={`#${h.id}`}
                className={`block truncate transition-colors ${
                  active === h.id
                    ? "text-accent"
                    : "text-ink-muted hover:text-ink"
                } ${/* smaller on mobile, even smaller on desktop */ ""} text-sm lg:text-xs`}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
