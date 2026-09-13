"use client";

/**
 * THE HUMAN EDIT - Writer Desk editor (§12.3, §12.4, §46)
 * Tiptap with autosave, word count, reading time, outline sync,
 * and keyboard-first workflow. The center is the writer's space.
 */

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder, CharacterCount } from "@tiptap/extensions";
import { useEffect, useMemo, useRef, useState } from "react";

export interface WriterEditorProps {
  initialContent: unknown;
  onContentChange: (json: unknown, plainText: string) => void;
  saveStatus: "saved" | "saving" | "dirty";
}

export function WriterEditor({
  initialContent,
  onContentChange,
  saveStatus,
}: WriterEditorProps) {
  const lastEmitted = useRef<string>("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Write something worth reading…",
      }),
      CharacterCount,
    ],
    content: initialContent as never,
    editorProps: {
      attributes: {
        class: "writer-prose focus:outline-none",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      if (json !== lastEmitted.current) {
        lastEmitted.current = json;
        onContentChange(editor.getJSON(), editor.getText());
      }
    },
  });

  const stats = useMemo(() => {
    if (!editor) return { words: 0, minutes: 0 };
    const words = editor.storage.characterCount?.words?.() ?? 0;
    const minutes = Math.max(1, Math.round(words / 220));
    return { words, minutes };
  }, [editor, saveStatus]);

  // §12.4 heading outline, synced with document structure
  const outline = useMemo(() => {
    if (!editor) return [] as Array<{ level: number; text: string; pos: number }>;
    const heads: Array<{ level: number; text: string; pos: number }> = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        heads.push({
          level: node.attrs.level as number,
          text: node.textContent,
          pos,
        });
      }
      return true;
    });
    return heads;
  }, [editor, saveStatus]);

  if (!editor) return null;

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Left rail: outline (§12.3) */}
      <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-line px-4 py-6 lg:block">
        <p className="meta-line font-medium">Outline</p>
        {outline.length === 0 ? (
          <p className="mt-3 text-xs text-ink-faint">
            Headings you add will appear here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {outline.map((h) => (
              <li
                key={h.pos}
                style={{ paddingLeft: `${(h.level - 1) * 0.75}rem` }}
              >
                <button
                  onClick={() =>
                    editor.chain().focus().setTextSelection(h.pos).scrollIntoView().run()
                  }
                  className="truncate text-left text-sm text-ink-muted transition-colors hover:text-ink"
                  title={h.text}
                >
                  {h.text || "—"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Center: the editor (§12.3 - writer's space) */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-line px-6 py-2">
          <div className="meta-line flex gap-4">
            <span>
              {stats.words} {stats.words === 1 ? "word" : "words"}
            </span>
            <span>~{stats.minutes} min read</span>
          </div>
          <span
            className="text-xs"
            aria-live="polite"
          >
            {saveStatus === "saving" && (
              <span className="text-ink-muted">Saving…</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-success">Draft saved</span>
            )}
            {saveStatus === "dirty" && (
              <span className="text-warning">Unsaved changes</span>
            )}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-10">
          <div className="mx-auto max-w-2xl">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}
