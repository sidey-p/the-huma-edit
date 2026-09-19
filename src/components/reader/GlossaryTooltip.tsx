"use client";

/**
 * Glossary tooltip — hover on desktop, tap on mobile.
 * Shows word meaning, pronunciation, and usage example in a floating card.
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
  const [position, setPosition] = useState<"above" | "below">("above");
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isMobile = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

  const show = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
    // Determine position after render
    requestAnimationFrame(() => {
      if (triggerRef.current && tooltipRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const spaceAbove = triggerRect.top;
        setPosition(spaceAbove > tooltipRect.height + 12 ? "above" : "below");
      }
    });
  }, []);

  const hide = useCallback(() => {
    if (isMobile) return; // mobile uses tap to toggle
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  }, [isMobile]);

  const toggle = useCallback(() => {
    if (isMobile) {
      setOpen((prev) => !prev);
    }
  }, [isMobile]);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  // Close on outside tap (mobile)
  useEffect(() => {
    if (!open || !isMobile) return;
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
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open, isMobile]);

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
          className={`glossary-tooltip ${position}`}
          role="tooltip"
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
          <span className="glossary-hint">{isMobile ? "Tap to close" : "Hover to keep open"}</span>
        </span>
      )}
    </span>
  );
}
