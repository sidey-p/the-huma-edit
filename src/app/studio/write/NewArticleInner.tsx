"use client";

/**
 * New article composer (§12.2 Writing): quick start from the Desk.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function NewArticleInner() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || `untitled-${Date.now()}`;

  const create = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      // ensure a slug-free draft: unique slug from title + timestamp suffix
      const slug = slugify(title.trim());
      const { data: clash } = await supabase
        .from("articles")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      const finalSlug = clash ? `${slug}-${Date.now().toString(36)}` : slug;

      const { data, error: insertError } = await supabase
        .from("articles")
        .insert({
          title: title.trim(),
          slug: finalSlug,
          status: "draft",
          content_text: "",
          human_authorship_attested: true,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      if (data) {
        await supabase.from("article_workflow").insert({
          article_id: data.id,
          state: "draft",
        });
        router.push(`/studio/articles/${data.id}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create the draft.",
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
        placeholder="A working title: you can change it later"
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
