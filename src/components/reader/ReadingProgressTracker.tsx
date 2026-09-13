"use client";

/**
 * Reading progress (7.6): thin indicator near the top.
 * Not a performance score - quietly tracks scroll, saves position (10.4).
 */

import { useEffect, useState, useRef } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";

export function ReadingProgressTracker({ articleId }: { articleId: string }) {
  const { isAuthenticated } = useConvexAuth();
  const update = useMutation(api.library.updateReadingProgress);
  const [percent, setPercent] = useState(0);
  const lastSent = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 100;
      setPercent(p);
      if (isAuthenticated && Math.abs(p - lastSent.current) >= 10) {
        lastSent.current = p;
        void update({
          articleId: articleId as never,
          progressPercent: p,
          scrollAnchor: String(Math.round(window.scrollY)),
        });
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [articleId, isAuthenticated, update]);

  return (
    <div
      className="fixed inset-x-0 top-0 z-40 h-0.5 bg-transparent"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-accent transition-[width] duration-150 ease-linear"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
