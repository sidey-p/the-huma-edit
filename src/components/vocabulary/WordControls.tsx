"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

/**
 * Pronounce button. Uses the browser's SpeechSynthesis API
 * (Web Speech API): no external service, works offline.
 */
export function PronounceButton({ word }: { word: string }) {
  const [speaking, setSpeaking] = useState(false);

  const speak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={`Pronounce ${word}`}
      className="icon-btn inline-flex items-center gap-1.5 text-sm"
      style={{
        width: "auto",
        height: "auto",
        padding: "0.25rem 0.5rem",
        borderRadius: "999px",
        background: speaking ? "color-mix(in srgb, var(--orange) 12%, transparent)" : "transparent",
      }}
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
        style={speaking ? { animation: "spin 0.8s linear infinite" } : undefined}
      >
        <path d="M11 5 6 9H2v6h4l5 4V5Z" />
        {speaking ? (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" style={{ animation: "pulse 0.6s ease-in-out infinite" }} />
            <path d="M19 5a9 9 0 0 1 0 14" style={{ animation: "pulse 0.6s ease-in-out infinite 0.15s" }} />
          </>
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
 * §18.3 - Save word to personal vocabulary (user_vocabulary).
 * Requires auth; shows a quiet sign-in hint when signed out.
 */
export function SaveWordButton({ wordId }: { wordId: string }) {
  const [state, setState] = useState<"idle" | "saved" | "anon" | "busy">(
    "idle",
  );

  // Reflect existing save on mount.
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("user_vocabulary")
        .select("id")
        .eq("word_id", wordId)
        .maybeSingle();
      if (data) setState("saved");
    });
  }, [wordId]);

  const onClick = async () => {
    if (state === "saved" || state === "busy") return;
    setState("busy");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState("anon");
      return;
    }
    const { error } = await supabase
      .from("user_vocabulary")
      .insert({ user_id: user.id, word_id: wordId });
    setState(error ? "anon" : "saved");
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
