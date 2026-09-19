"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { ThemeProvider } from "./ThemeProvider";

/**
 * Site-wide interaction layer (invisible behaviors only):
 * - FIRST EVER visit on a big page (home, explore, sign-up): full brand
 *   splash, one time only (localStorage).
 * - Repeat visits on big pages: quick spinner + random quote.
 * - NEVER on article/browsing/reading pages: instant load.
 * - Scroll-reveal, masthead condense, outside-tap close, cursor dot.
 *
 * Visible header controls (ThemeToggle, MobileNav) are exported
 * separately and placed inside the masthead action row.
 */
export function SiteScripts() {
  return (
    <>
      <ThemeProvider />
      <FirstLoad />
      <RouteLoader />
      <Reveal />
      <MastheadCondense />
      <CursorDot />
      <OutsideTapClose />
    </>
  );
}

const QUOTES = [
  "A word after a word after a word is power.",
  "Read. Sit. Drink. And think not much of time.",
  "The reader lives a thousand lives before he dies.",
  "We read to know we are not alone.",
  "Books are quiet gardens of the mind.",
  "Every story begins somewhere small.",
  "Patience is the companion of wisdom.",
  "The best time to read was yesterday. The next best is now.",
  "A quiet page is a loud world.",
];

/** Big-task pages that earn the first-visit splash / quote spinner. */
function isBigPage(path: string) {
  if (
    path.startsWith("/articles/") ||
    path.startsWith("/corners/") ||
    path.startsWith("/topics/") ||
    path.startsWith("/authors/") ||
    path.startsWith("/paths/") ||
    path.startsWith("/studio/") ||
    path === "/library" ||
    path === "/settings"
  ) {
    return false;
  }
  return true; // home, explore, search, archive, sign-in: the big moments
}

function FirstLoad() {
  const [quote, setQuote] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current) return;
    decided.current = true;

    const path = window.location.pathname;
    if (!isBigPage(path)) return; // reading/browsing: instant, no overlay

    let seen = false;
    try {
      seen = localStorage.getItem("hume-visited") === "1";
    } catch {}

    const reduceMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      try {
        localStorage.setItem("hume-visited", "1");
      } catch {}
      return; // reduced motion: never block the reader
    }

    if (!seen) {
      // First ever visit: full brand splash, then never again.
      try {
        localStorage.setItem("hume-visited", "1");
      } catch {}
      setShowSplash(true);
      const t = window.setTimeout(() => setShowSplash(false), 1500);
      const t2 = window.setTimeout(() => setShowSplash(false), 3600);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    }

    // Repeat visits: quick spinner + rotating quote.
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    setShowSpinner(true);
    const t = window.setTimeout(() => setShowSpinner(false), 750);
    const t2 = window.setTimeout(() => setShowSpinner(false), 2000);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, []);

  return (
    <>
      {showSplash && (
        <div id="splash" aria-hidden="true">
          <div>
            <div className="splash-mark" aria-hidden="true">
              {"The Human Edit".split("").map((ch, i) => (
                <span key={i} style={{ ["--i" as string]: i }}>
                  {ch === " " ? "\u00A0" : ch}
                </span>
              ))}
            </div>
            <div className="splash-rule" />
          </div>
        </div>
      )}
      {showSpinner && (
        <div className="quote-loader" aria-hidden="true">
          <div className="quote-brand">The Human Edit</div>
          <div className="quote-divider">
            <span /><span /><span />
          </div>
          {quote && <blockquote className="quote-text">{quote}</blockquote>}
        </div>
      )}
    </>
  );
}

/** Shows quote loader during client-side route transitions. */
function RouteLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<string | null>(null);
  const prevPath = useRef(pathname);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    setLoading(true);

    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLoading(false), 400);

    return () => clearTimeout(timer.current);
  }, [pathname]);

  return (
    <>
      <div className={`route-progress ${loading ? "active" : ""}`} />
      {loading && (
        <div className="quote-loader" aria-hidden="true" style={{ opacity: 1 }}>
          <div className="quote-brand">The Human Edit</div>
          <div className="quote-divider">
            <span /><span /><span />
          </div>
          {quote && <blockquote className="quote-text">{quote}</blockquote>}
        </div>
      )}
    </>
  );
}

function Reveal() {
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    document.querySelectorAll<HTMLElement>("[data-stagger]").forEach((group) => {
      Array.from(group.children).forEach((child, i) => {
        const el = child as HTMLElement;
        el.classList.add("reveal");
        el.dataset.delay = String(i * 90);
      });
    });

    const revealEls = document.querySelectorAll<HTMLElement>(".reveal");

    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.classList.add("in-view"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = Number(el.dataset.delay || 0);
            el.style.transitionDelay = delay + "ms";
            el.classList.add("in-view");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}

function MastheadCondense() {
  useEffect(() => {
    const masthead = document.querySelector(".masthead");
    if (!masthead) return;
    const onScroll = () => {
      masthead.setAttribute(
        "data-condensed",
        window.scrollY > 8 ? "true" : "false"
      );
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}

function rippleFrom(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const size = Math.hypot(window.innerWidth, window.innerHeight) * 2.1;
  const dot = document.createElement("span");
  dot.className = "theme-ripple";
  dot.style.width = dot.style.height = size + "px";
  dot.style.left = x + "px";
  dot.style.top = y + "px";
  dot.style.opacity = "0.12";
  document.body.appendChild(dot);
  requestAnimationFrame(() => {
    dot.style.transition = "transform 650ms cubic-bezier(.4,0,.2,1)";
    dot.style.transform = "translate(-50%,-50%) scale(1)";
  });
  window.setTimeout(() => dot.remove(), 700);
}

export function toggleTheme(el?: HTMLElement | null) {
  const root = document.documentElement;
  const current = root.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  try {
    localStorage.setItem("hume-theme", next);
  } catch {}
  root.setAttribute("data-theme", next);
  root.setAttribute("data-theme-mode", next);
  root.style.colorScheme = next;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion && el) rippleFrom(el);
  // Signed-in users: persist so the preference roams across devices.
  void createClient()
    .auth.getUser()
    .then(({ data: { user } }) => {
      if (!user) return;
      void createClient()
        .from("reader_preferences")
        .upsert({
          user_id: user.id,
          site_theme: next,
          updated_at: new Date().toISOString(),
        });
    });
}

/** Sun/moon day-dial. Rendered inside the masthead action row. */
export function ThemeToggle() {
  return (
    <button
      className="icon-btn theme-toggle"
      aria-label="Toggle dark and light mode"
      type="button"
      onClick={(e) => toggleTheme(e.currentTarget)}
    >
      <svg
        className="sun"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.4M12 19v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.5 12h2.4M19 12h2.4M4.9 19l1.7-1.7M17.4 6.6l1.7-1.7" />
      </svg>
      <svg
        className="moon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}

function CursorDot() {
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!hasFinePointer || reduceMotion) return;

    const dot = document.createElement("div");
    dot.className = "cursor-dot";
    document.body.appendChild(dot);

    const onMove = (e: MouseEvent) => {
      dot.style.left = e.clientX + "px";
      dot.style.top = e.clientY + "px";
      dot.classList.add("active");
    };
    const onLeave = () => dot.classList.remove("active");
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("a, button")) dot.classList.add("grow");
      else dot.classList.remove("grow");
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseover", onOver);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseover", onOver);
      dot.remove();
    };
  }, []);

  return null;
}

/**
 * Hamburger + slide-down panel. Phones only (CSS hides the button on
 * larger screens). The panel anchors to the sticky masthead.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="icon-btn nav-toggle"
        aria-label="Open menu"
        aria-expanded={open}
        type="button"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>
      {open && (
        <nav className="primary-nav" data-open="true" aria-label="Mobile">
          <Link href="/explore" onClick={() => setOpen(false)}>Explore</Link>
          <Link href="/corners" onClick={() => setOpen(false)}>Corners</Link>
          <Link href="/paths" onClick={() => setOpen(false)}>Paths</Link>
          <Link href="/library" onClick={() => setOpen(false)}>Library</Link>
          <Link href="/archive" onClick={() => setOpen(false)}>Archive</Link>
          <Link href="/search" onClick={() => setOpen(false)}>Search</Link>
          <Link href="/settings" onClick={() => setOpen(false)}>Account</Link>
        </nav>
      )}
    </>
  );
}

/** Closes any open popover when tapping outside it. */
function OutsideTapClose() {
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      // appearance panel + notification panel + mobile menu
      if (!t.closest(".appearance-host")) {
        document
          .querySelectorAll(".appearance-pop")
          .forEach((el) => el.setAttribute("hidden", ""));
        document
          .querySelectorAll('[data-appearance-open="true"]')
          .forEach((el) => el.setAttribute("data-appearance-open", "false"));
      }
      if (!t.closest(".notif-host")) {
        document
          .querySelectorAll(".notif-panel")
          .forEach((el) => el.setAttribute("hidden", ""));
        document
          .querySelectorAll('[data-notif-open="true"]')
          .forEach((el) => el.setAttribute("data-notif-open", "false"));
      }
      if (!t.closest(".nav-toggle") && !t.closest(".primary-nav")) {
        const nav = document.querySelector(".primary-nav");
        if (nav?.getAttribute("data-open") === "true") {
          nav.setAttribute("data-open", "false");
          document
            .querySelector(".nav-toggle")
            ?.setAttribute("aria-expanded", "false");
        }
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return null;
}
