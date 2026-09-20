"use client";

/**
 * Glossary tooltip — hover on desktop, tap on mobile.
 * Fully responsive: fixed-position on mobile, absolute on desktop.
 * Stays within viewport on all screen sizes.
 */

import { useState, useRef, useEffect, useCallback } from "react";

export interface GlossaryWord {
  word: string;
  partOfSpeech: string | null;
  plainMeaning: string;
  pronunciation: string | null;
  usageExample: string | null;
}

interface GlossaryTooltipProps {
  word: GlossaryWord;
  children: React.ReactNode;
}

export function GlossaryTooltip({ word, children }: GlossaryTooltipProps) {
  const [open, setOpen] = useState(false);
  const [mobileMode, setMobileMode] = useState(false);
  const [posStyle, setPosStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Detect mobile/touch on mount and on resize
  useEffect(() => {
    const check = () => {
      setMobileMode(window.matchMedia("(hover: none)").matches || window.innerWidth < 768);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const calcPosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const tip = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (mobileMode) {
      // Mobile: fixed center-bottom of screen
      setPosStyle({
        position: "fixed",
        bottom: "1rem",
        left: "1rem",
        right: "1rem",
        top: "auto",
        transform: "none",
        width: "auto",
        maxHeight: "50vh",
        overflowY: "auto",
      });
    } else {
      // Desktop: absolute, clamped to viewport
      const spaceAbove = trigger.top;
      const spaceBelow = vh - trigger.bottom;
      const above = spaceAbove > tip.height + 12 && spaceAbove > spaceBelow;

      let left = trigger.left + trigger.width / 2 - tip.width / 2;
      // Clamp horizontal
      left = Math.max(8, Math.min(left, vw - tip.width - 8));

      const top = above
        ? trigger.top - tip.height - 8 + window.scrollY
        : trigger.bottom + 8 + window.scrollY;

      setPosStyle({
        position: "absolute",
        top,
        left,
        transform: "none",
        width: tip.width,
      });
    }
  }, [mobileMode]);

  const show = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
    requestAnimationFrame(calcPosition);
  }, [calcPosition]);

  const hide = useCallback(() => {
    if (mobileMode) return;
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  }, [mobileMode]);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  // Recalculate on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const onScroll = () => calcPosition();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, calcPosition]);

  // Close on outside tap
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        tooltipRef.current && !tooltipRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  return (
    <span
      ref={triggerRef}
      className="glossary-trigger"
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={toggle}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((prev) => !prev);
        }
        if (e.key === "Escape") setOpen(false);
      }}
    >
      {children}
      {open && (
        <span
          ref={tooltipRef}
          className={`glossary-tooltip ${mobileMode ? "mobile" : "desktop"}`}
          role="tooltip"
          style={posStyle}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <span className="glossary-header">
            <span className="glossary-word">{word.word}</span>
            {word.partOfSpeech && (
              <span className="glossary-pos">{word.partOfSpeech}</span>
            )}
          </span>
          {word.pronunciation && (
            <span className="glossary-pronunciation">{word.pronunciation}</span>
          )}
          <span className="glossary-meaning">{word.plainMeaning}</span>
          {word.usageExample && (
            <span className="glossary-example">&ldquo;{word.usageExample}&rdquo;</span>
          )}
          <span className="glossary-hint">{mobileMode ? "Tap anywhere to close" : "Hover to keep open"}</span>
        </span>
      )}
    </span>
  );
}
