"use client";

/**
 * New article composer (§12.2 Writing): quick start from the Desk.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConvex } from "convex/react";
import { api } from "@convex/_generated/api";

export default function NewArticleInner() {
  const convex = useConvex();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const id = await convex.mutation(api.articles.create, {
        title: title.trim(),
      });
      router.push(`/studio/articles/${id}`);
    } catch (err) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Could not create the draft.",
      );
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-20 sm:px-6">
      <p className="meta-line">Edit Studio</p>
      <h1 className="display-lg mt-2">New article</h1>
      <label htmlFor="new-title" className="meta-line mt-10 block">
        What are you writing?
      </label>
      <input
        id="new-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && create()}
        placeholder="A working title — you can change it later"
        className="mt-3 w-full rounded-editorial border border-line bg-paper-raised px-4 py-3 text-lg focus:border-accent focus:outline-none"
        autoFocus
      />
      {error && <p className="mt-4 text-sm text-error">{error}</p>}
      <button
        onClick={create}
        disabled={!title.trim() || busy}
        className="mt-6 rounded-editorial border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Creating…" : "Open the editor"}
      </button>
      <p className="mt-6 text-sm text-ink-muted">
        Templates (essay, short story, how-to) arrive with the full Studio.
      </p>
    </div>
  );
}
