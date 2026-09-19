"use client";

/**
 * TL;DR summary — collapsible box at the top of articles.
 * Uses the article's dek as the summary. Human-written, no AI.
 */

import { useState } from "react";

interface TldrSummaryProps {
  text: string;
}

export function TldrSummary({ text }: TldrSummaryProps) {
  const [expanded, setExpanded] = useState(true);

  if (!text) return null;

  return (
    <div className="tldr-box" data-expanded={expanded}>
      <button
        className="tldr-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="tldr-label">TL;DR</span>
        <svg
          className="tldr-chevron"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <p className="tldr-text">{text}</p>
      )}
    </div>
  );
}
