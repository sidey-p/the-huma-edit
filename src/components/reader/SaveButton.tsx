"use client";

/**
 * Reading controls (7.4): quiet persistent actions.
 * Save - bookmark confirmation via subtle motion (20.3).
 */

import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import { motion, AnimatePresence } from "motion/react";

export function SaveButton({ articleId }: { articleId: string }) {
  const { isAuthenticated } = useConvexAuth();
  const saved = useQuery(
    api.library.isSaved,
    isAuthenticated ? { articleId: articleId as never } : "skip",
  );
  const toggle = useMutation(api.library.toggleSave);
  const [justSaved, setJustSaved] = useState(false);

  if (!isAuthenticated) {
    return (
      <a
        href="/sign-in"
        className="meta-line rounded-editorial border border-line px-3 py-1.5 transition-colors hover:border-line-strong"
      >
        Save
      </a>
    );
  }

  return (
    <span className="relative inline-flex">
      <button
        onClick={async () => {
          const r = await toggle({ articleId: articleId as never });
          if (r.saved) {
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 1400);
          }
        }}
        aria-pressed={saved === true}
        aria-label={saved ? "Remove from library" : "Save to library"}
        className="meta-line flex items-center gap-1.5 rounded-editorial border px-3 py-1.5 transition-colors"
        style={{
          borderColor: saved ? "var(--accent)" : "var(--line)",
          color: saved ? "var(--accent)" : "inherit",
        }}
      >
        <svg
          aria-hidden="true"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
        </svg>
        {saved ? "Saved" : "Save"}
      </button>
      <AnimatePresence>
        {justSaved && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="meta-line pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-accent"
          >
            Kept for later
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
