"use client";

/**
 * Writer Desk client (§12.3): editor + autosave + inspector + workflow bar.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useConvex } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { WriterEditor } from "@/components/studio/WriterEditor";

export function WriterDesk({ articleId }: { articleId: string }) {
  const convex = useConvex();
  const article = useQuery(api.articles.getForStudio, {
    articleId: articleId as never,
  });

  const [title, setTitle] = useState("");
  const [dek, setDek] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "saved" | "saving" | "dirty"
  >("saved");
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<{ json: unknown; text: string } | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (article && !initialized.current) {
      initialized.current = true;
      setTitle(article.title);
      setDek(article.dek ?? "");
    }
  }, [article]);

  const persist = useCallback(async () => {
    if (!article || !contentRef.current) return;
    setSaveStatus("saving");
    try {
      await convex.mutation(api.articles.saveDraft, {
        articleId: article._id,
        title,
        dek: dek || undefined,
        contentJson: contentRef.current.json,
        contentText: contentRef.current.text,
      });
      setSaveStatus("saved");
    } catch (err) {
      setSaveStatus("dirty");
      setMessage(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Could not save. Changes kept locally.",
      );
    }
  }, [convex, article, title, dek]);

  const scheduleSave = useCallback(() => {
    setSaveStatus("dirty");
    if (timer.current) clearTimeout(timer.current);
    // §12.4 autosave: debounce 1.5s of quiet
    timer.current = setTimeout(persist, 1500);
  }, [persist]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onContentChange = useCallback(
    (json: unknown, text: string) => {
      contentRef.current = { json, text };
      scheduleSave();
    },
    [scheduleSave],
  );

  // Keyboard-first (§12.4): Cmd/Ctrl+S saves explicitly
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        persist();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [persist]);

  const submitForReview = async () => {
    if (!article) return;
    try {
      if (timer.current) clearTimeout(timer.current);
      await persist();
      await convex.mutation(api.articles.submitForReview, {
        articleId: article._id,
      });
      setMessage("Submitted for review.");
    } catch (err) {
      setMessage(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Could not submit.",
      );
    }
  };

  if (article === undefined) {
    return <p className="p-10 text-ink-muted">Loading draft…</p>;
  }
  if (article === null) {
    return (
      <div className="p-10">
        <p className="font-display text-2xl">This piece has left the shelves.</p>
        <Link href="/studio" className="mt-4 inline-block text-accent underline">
          Back to the Desk
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top workflow bar (§12.3) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper-raised px-4 py-2">
        <div className="flex items-center gap-3">
          <Link
            href="/studio"
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            ← Desk
          </Link>
          <span className="meta-line capitalize">{article.status}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/articles/${article.slug}`}
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Preview
          </Link>
          {(article.status === "draft" || article.status === "needs_changes") && (
            <button
              onClick={submitForReview}
              className="rounded-editorial border border-line px-3 py-1.5 text-sm transition-colors hover:border-accent"
            >
              Submit for review
            </button>
          )}
        </div>
      </div>

      {/* Title + dek */}
      <div className="border-b border-line px-6 py-5 sm:px-10">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave();
          }}
          placeholder="Title"
          aria-label="Article title"
          className="w-full bg-transparent font-display text-3xl text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <input
          value={dek}
          onChange={(e) => {
            setDek(e.target.value);
            scheduleSave();
          }}
          placeholder="A line beneath the headline (dek)"
          aria-label="Article dek"
          className="mt-2 w-full bg-transparent text-base italic text-ink-muted placeholder:text-ink-faint focus:outline-none"
        />
      </div>

      {message && (
        <p className="border-b border-line bg-paper-sunken px-6 py-2 text-sm text-ink-muted sm:px-10">
          {message}
        </p>
      )}

      {/* Editor + Inspector (§12.3 right rail) */}
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <WriterEditor
            key={article._id}
            initialContent={article.contentJson}
            onContentChange={onContentChange}
            saveStatus={saveStatus}
          />
        </div>
        {/* Inspector: publication checklist (§32) */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-line px-4 py-6 lg:block">
          <p className="meta-line font-medium">Before publishing</p>
          <ul className="mt-4 space-y-2.5">
            {(
              [
                ["Author assigned", article.checklist.authorAssigned],
                ["Title present", article.checklist.titlePresent],
                ["Dek present", article.checklist.dekPresent],
                ["Primary corner", article.checklist.primaryCornerSelected],
                ["Topic assigned", article.checklist.topicAssigned],
                ["Cover image", article.checklist.coverImagePresent],
                ["SEO description", article.checklist.seoDescriptionPresent],
                ["Reading time", article.checklist.readingTimeCalculated],
                [
                  "Human authorship",
                  article.checklist.humanAuthorshipAttested,
                ],
                ["No open comments", article.checklist.noUnresolvedComments],
              ] as Array<[string, boolean]>
            ).map(([label, ok]) => (
              <li
                key={label}
                className="flex items-center gap-2.5 text-sm"
                aria-label={`${label}: ${ok ? "ready" : "missing"}`}
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border"
                  style={{
                    borderColor: ok ? "var(--success)" : "var(--line-strong)",
                    background: ok ? "var(--success)" : "transparent",
                  }}
                />
                <span className={ok ? "text-ink" : "text-ink-faint"}>
                  {label}
                </span>
              </li>
            ))}
          </ul>
          {article.status === "approved" && (
            <button
              onClick={async () => {
                try {
                  await convex.mutation(api.articles.publish, {
                    articleId: article._id,
                  });
                  setMessage("Published.");
                } catch (err) {
                  setMessage(
                    err && typeof err === "object" && "message" in err
                      ? String((err as { message: string }).message)
                      : "Could not publish.",
                  );
                }
              }}
              className="mt-8 w-full rounded-editorial border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink"
            >
              Publish now
            </button>
          )}
          {article.status === "draft" && (
            <p className="mt-8 text-xs leading-relaxed text-ink-faint">
              The full checklist gates publishing. Metadata, taxonomy, and
              cover assignment arrive with the complete inspector.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
