"use client";

/** Follow a corner : notifications on new pieces (§follow). */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function FollowButton({ cornerId }: { cornerId: string }) {
  const [state, setState] = useState<"anon" | "off" | "on" | "busy">("off");

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setState("anon");
        return;
      }
      const { data } = await supabase
        .from("corner_follows")
        .select("corner_id")
        .eq("corner_id", cornerId)
        .maybeSingle();
      setState(data ? "on" : "off");
    });
  }, [cornerId]);

  const toggle = async () => {
    if (state === "anon") {
      window.location.href = "/sign-in";
      return;
    }
    if (state === "busy") return;
    setState("busy");
    const supabase = createClient();
    if (state === "on") {
      await supabase.from("corner_follows").delete().eq("corner_id", cornerId);
      setState("off");
    } else {
      const { error } = await supabase
        .from("corner_follows")
        .insert({ corner_id: cornerId });
      setState(error ? "off" : "on");
    }
  };

  return (
    <button
      onClick={toggle}
      className={`follow-btn ${state === "on" ? "following" : ""}`}
      aria-pressed={state === "on"}
      type="button"
    >
      {state === "on" ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Following
        </>
      ) : state === "anon" ? (
        "Follow this corner"
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Follow this corner
        </>
      )}
    </button>
  );
}
