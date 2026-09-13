"use client";

import { useEffect } from "react";
import { ThemeProvider } from "./ThemeProvider";

/**
 * Site-wide interaction layer — port of the reference main.js:
 * splash loader, scroll-reveal, masthead condense, theme toggle
 * with ripple, cursor accent, mobile nav. Every animation is
 * triggered by a real event; nothing loops except the hero "live" dot.
 */
export function SiteScripts() {
  return (
    <>
      <ThemeProvider />
      <Splash />
      <Reveal />
      <MastheadCondense />
      <ThemeToggle />
      <CursorDot />
      <MobileNav />
    </>
  );
}

function Splash() {
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const splash = document.getElementById("splash");
    if (!splash) return;
    const hide = () => splash.setAttribute("data-hidden", "true");
    // Give the wordmark animation time to land, then lift the curtain.
    const t1 = window.setTimeout(hide, reduceMotion ? 0 : 1350);
    // Never trap a user behind the splash if something goes wrong.
    const t2 = window.setTimeout(hide, 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
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
  );
}

function Reveal() {
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Stagger children of any [data-stagger] container.
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
  dot.style.opacity = "0.06";
  document.body.appendChild(dot);
  requestAnimationFrame(() => {
    dot.style.transition = "transform 650ms cubic-bezier(.4,0,.2,1)";
    dot.style.transform = "translate(-50%,-50%) scale(1)";
  });
  window.setTimeout(() => dot.remove(), 700);
}

function ThemeToggle() {
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;

    const onClick = (e: Event) => {
      const root = document.documentElement;
      const current = root.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("hume-theme", next);
      } catch {}
      root.setAttribute("data-theme", next);
      root.setAttribute("data-theme-mode", next);
      if (!reduceMotion) rippleFrom(e.currentTarget as HTMLElement);
    };
    btn.addEventListener("click", onClick);
    return () => btn.removeEventListener("click", onClick);
  }, []);

  return (
    <button
      className="icon-btn theme-toggle"
      id="theme-toggle"
      aria-label="Toggle dark and light mode"
      type="button"
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
    const onEnter = () => dot.classList.add("grow");
    const onExit = () => dot.classList.remove("grow");

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("a, button")) onEnter();
      else onExit();
    };
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

function MobileNav() {
  useEffect(() => {
    const navToggle = document.querySelector<HTMLButtonElement>(".nav-toggle");
    const nav = document.querySelector<HTMLElement>(".primary-nav");
    if (!navToggle || !nav) return;

    const onClick = () => {
      const open = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", String(!open));
      navToggle.setAttribute("aria-expanded", String(!open));
    };
    navToggle.addEventListener("click", onClick);
    return () => navToggle.removeEventListener("click", onClick);
  }, []);

  return (
    <button
      className="icon-btn nav-toggle"
      aria-label="Open menu"
      aria-expanded="false"
      type="button"
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
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}
