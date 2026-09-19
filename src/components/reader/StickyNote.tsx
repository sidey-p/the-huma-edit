"use client";

/**
 * Sticky note for highlighting — replaces window.prompt().
 * Desktop: floats on the right side rail.
 * Mobile: collapsible inline bar.
 */

import { useState, useRef, useEffect } from "react";

interface StickyNoteProps {
  text: string;
  onSave: (text: string, note: string | null) => void;
  onCancel: () => void;
}

export function StickyNote({ text, onSave, onCancel }: StickyNoteProps) {
  const [note, setNote] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = note.trim();
    onSave(text, trimmed || null);
  };

  return (
    <div className="sticky-note-host">
      {/* Desktop: right-side sticky note */}
      <div className="sticky-note-desktop">
        <div className="sticky-note-paper">
          <div className="sticky-note-header">
            <span className="sticky-note-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </span>
            <span className="sticky-note-title">Add a note</span>
            <button onClick={onCancel} className="sticky-note-close" aria-label="Cancel">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="sticky-note-quote">&ldquo;{text.length > 80 ? text.slice(0, 80) + "..." : text}&rdquo;</p>
          <textarea
            ref={textareaRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What does this mean to you?"
            className="sticky-note-input"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
              if (e.key === "Escape") onCancel();
            }}
          />
          <div className="sticky-note-actions">
            <button onClick={onCancel} className="sticky-note-btn-cancel">Cancel</button>
            <button onClick={handleSubmit} className="sticky-note-btn-save">Save note</button>
          </div>
        </div>
      </div>

      {/* Mobile: inline collapsible bar */}
      <div className="sticky-note-mobile">
        <div className="sticky-note-mobile-paper">
          <p className="sticky-note-mobile-quote">&ldquo;{text.length > 50 ? text.slice(0, 50) + "..." : text}&rdquo;</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Your note..."
            className="sticky-note-mobile-input"
            rows={2}
          />
          <div className="sticky-note-mobile-actions">
            <button onClick={onCancel} className="sticky-note-btn-cancel">Cancel</button>
            <button onClick={handleSubmit} className="sticky-note-btn-save">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
