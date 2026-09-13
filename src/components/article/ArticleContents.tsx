"use client";

/**
 * Article contents (7.7): scroll-aware TOC for long articles,
 * collapsible on mobile, generated from editor-defined headings.
 */

import { useEffect, useState } from "react";

export function ArticleContents() {
  const [heads, setHeads] = useState<
    Array<{ id: string; text: string; level: number }>
  >([]);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

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
    // defer to next tick to avoid synchronous setState in effect
    const t = setTimeout(() => {
      setHeads(found);
      if (found.length < 3) setOpen(false);
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
      className="sticky top-20 hidden max-h-[70vh] w-52 overflow-y-auto lg:block"
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="meta-line font-medium"
      >
        {open ? "Contents −" : "Contents +"}
      </button>
      {open && (
        <ul className="mt-3 space-y-2 border-l border-line pl-3">
          {heads.map((h) => (
            <li key={h.id} style={{ paddingLeft: (h.level - 2) * 0.5 }}>
              <a
                href={`#${h.id}`}
                className={`block truncate text-xs transition-colors ${
                  active === h.id
                    ? "text-accent"
                    : "text-ink-muted hover:text-ink"
                }`}
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
