"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

/**
 * §18.1 — Pronounce button. Uses the browser's speech synthesis
 * (Web Speech API) — no external service, works offline.
 */
export function PronounceButton({ word }: { word: string }) {
  const [speaking, setSpeaking] = useState(false);

  const speak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={`Pronounce ${word}`}
      className="icon-btn inline-flex items-center gap-1.5 text-sm"
      style={{ width: "auto", height: "auto", padding: "0.25rem 0.5rem", borderRadius: "999px" }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M11 5 6 9H2v6h4l5 4V5Z" />
        {speaking ? (
          <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
        ) : (
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        )}
      </svg>
      <span className="meta-line" style={{ fontSize: "0.75rem" }}>
        {speaking ? "speaking" : "say it"}
      </span>
    </button>
  );
}

/**
 * §18.3 — Save word to personal vocabulary. Requires auth;
 * shows a quiet sign-in hint when signed out.
 */
export function SaveWordButton({ wordId }: { wordId: string }) {
  const [state, setState] = useState<"idle" | "saved" | "anon" | "busy">(
    "idle",
  );
  const save = useMutation(api.vocabulary.saveWord);

  const onClick = async () => {
    if (state === "saved" || state === "busy") return;
    setState("busy");
    try {
      await save({ wordId: wordId as never });
      setState("saved");
    } catch {
      setState("anon");
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "saved" || state === "busy"}
      className="ink-link text-sm font-medium"
      data-testid="save-word"
    >
      {state === "saved"
        ? "Saved to your vocabulary"
        : state === "busy"
          ? "Saving…"
          : state === "anon"
            ? "Sign in to save words"
            : "Save this word"}
    </button>
  );
}
