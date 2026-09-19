"use client";

/**
 * §10.3 Highlights : selection-based, browser-first.
 * Guests: localStorage. Signed-in: highlights table in db.
 * A small popover appears over selections with highlight + note.
 */

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/browser";
import { StickyNote } from "./StickyNote";

type SavedHighlight = {
  id: string;
  text: string;
  note: string | null;
  articleId: string;
};

export function Highlighter({ articleId }: { articleId: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [existing, setExisting] = useState<SavedHighlight[]>([]);
  const [popover, setPopover] = useState<{ x: number; y: number; text: string } | null>(null);
  const [noteMode, setNoteMode] = useState<{ x: number; y: number; text: string } | null>(null);

  // auth + load existing highlights
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      setSignedIn(!!user);
      setAuthChecked(true);
      if (user) {
        const { data } = await supabase
          .from("highlights")
          .select("id, selected_text, note")
          .eq("article_id", articleId);
        setExisting(
          ((data ?? []) as Array<{ id: string; selected_text: string; note: string | null }>).map((h) => ({
            id: h.id,
            text: h.selected_text,
            note: h.note,
            articleId,
          })),
        );
      } else {
        try {
          const raw = JSON.parse(
            localStorage.getItem(`hume-hl-${articleId}`) ?? "[]",
          );
          setExisting(raw);
        } catch {}
      }
    });
  }, [articleId]);

  const save = useCallback(
    async (text: string, note: string | null) => {
      const supabase = createClient();
      if (signedIn) {
        const { data, error } = await supabase
          .from("highlights")
          .insert({
            article_id: articleId,
            selected_text: text,
            note,
            style: "yellow",
          })
          .select("id")
          .single();
        if (!error && data) {
          setExisting((prev) => [
            { id: data.id, text, note, articleId },
            ...prev,
          ]);
        }
      } else {
        setExisting((prev) => {
          const next = [
            { id: `local-${Date.now()}`, text, note, articleId },
            ...prev,
          ];
          localStorage.setItem(
            `hume-hl-${articleId}`,
            JSON.stringify(next),
          );
          return next;
        });
      }
    },
    [articleId, signedIn],
  );

  // selection listener : position a popover near the selection
  useEffect(() => {
    const onUp = (e: MouseEvent) => {
      // Don't open popover if clicking inside the popover or sticky note
      const target = e.target as HTMLElement;
      if (target.closest("[role='toolbar']") || target.closest(".sticky-note-host")) return;

      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? "";
      if (!sel || text.length < 8 || !sel.rangeCount) {
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      setPopover({
        x: rect.left + rect.width / 2,
        y: rect.top,
        text,
      });
    };

    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Close popover when clicking outside it
      if (popover && !target.closest("[role='toolbar']")) {
        setPopover(null);
      }
      // Close sticky note when clicking outside it
      if (noteMode && !target.closest(".sticky-note-host")) {
        setNoteMode(null);
      }
    };

    document.addEventListener("mouseup", onUp);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("mousedown", onDown);
    };
  }, [popover, noteMode]);

  // resume-restore: re-wrap stored highlights visually (simple mark pass)
  useEffect(() => {
    if (existing.length === 0) return;
    const body = document.querySelector(".article-body");
    if (!body) return;
    // Avoid double-wrap on re-renders.
    if (body.querySelector("mark.hume")) return;
    let html = body.innerHTML;
    for (const hl of existing) {
      if (!hl.text) continue;
      const esc = hl.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      try {
        html = html.replace(
          new RegExp(esc),
          `<mark class="hume" style="background: color-mix(in srgb, var(--gold) 28%, transparent); color: inherit;">${hl.text}</mark>`,
        );
      } catch {}
    }
    body.innerHTML = html;
  }, [existing]);

  const removeHighlight = async (id: string) => {
    const supabase = createClient();
    if (signedIn && !id.startsWith("local-")) {
      await supabase.from("highlights").delete().eq("id", id);
    } else {
      const next = existing.filter((h) => h.id !== id);
      localStorage.setItem(
        `hume-hl-${articleId}`,
        JSON.stringify(next),
      );
    }
    setExisting(existing.filter((h) => h.id !== id));
    // unwrap marks containing this text
    document
      .querySelectorAll("mark.hume")
      .forEach((m) => {
        if (existing.find((h) => h.id === id && m.textContent === h.text)) {
          m.replaceWith(document.createTextNode(m.textContent ?? ""));
        }
      });
  };

  return (
    <>
      {/* selection popover */}
      {popover && (
        <div
          className="fixed z-50 flex gap-1 rounded-editorial border border-line bg-paper-raised p-1 shadow-md"
          style={{
            left: popover.x,
            top: popover.y - 44,
            transform: "translateX(-50%)",
          }}
          role="toolbar"
          aria-label="Highlight actions"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              void save(popover.text, null);
              setPopover(null);
            }}
            className="rounded-editorial-sm px-2.5 py-1 text-xs font-medium transition-colors hover:bg-rule"
            style={{ background: "color-mix(in srgb, var(--gold) 30%, transparent)" }}
          >
            Highlight
          </button>
          <button
            onClick={() => {
              setNoteMode(popover);
              setPopover(null);
            }}
            className="rounded-editorial-sm px-2.5 py-1 text-xs transition-colors hover:bg-rule"
          >
            Note
          </button>
        </div>
      )}

      {/* sticky note for adding notes */}
      {noteMode && (
        <StickyNote
          text={noteMode.text}
          onSave={(text, note) => {
            void save(text, note);
            setNoteMode(null);
          }}
          onCancel={() => setNoteMode(null)}
        />
      )}

      {/* saved list */}
      {existing.length > 0 && (
        <aside className="mt-14 border-t border-line pt-6" aria-labelledby="my-highlights">
          <h2 id="my-highlights" className="meta-line font-medium">
            Your highlights from this piece
          </h2>
          <ul className="mt-3 space-y-4">
            {existing.map((h) => (
              <li key={h.id} className="border-l-2 border-gold pl-4">
                <p className="font-display italic text-ink">“{h.text}”</p>
                {h.note && (
                  <p className="mt-1 text-sm text-ink-muted">{h.note}</p>
                )}
                <button
                  onClick={() => void removeHighlight(h.id)}
                  className="meta-line mt-1 transition-colors hover:text-error"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </>
  );
}
