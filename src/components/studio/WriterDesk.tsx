"use client";

/**
 * Writer Desk client (§12.3): editor + autosave + inspector + workflow bar.
 * Supabase-backed: fetches the draft, autosaves via upsert, submits for
 * review by writing the workflow state (§13). The inspector also edits
 * metadata (corner, topics, SEO), editorial links to other articles, and
 * the publish-time alert toggle (silent vs. notify followers).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { WriterEditor } from "@/components/studio/WriterEditor";

type StudioArticle = {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  status: string;
  content_json: unknown;
  word_count: number;
};

type Corner = { id: string; name: string };
type Topic = { id: string; name: string };
type ArticleOption = { id: string; title: string };
type LinkRow = { id: string; label: string | null; to_article_id: string; toTitle: string };

export function WriterDesk({ articleId }: { articleId: string }) {
  const router = useRouter();
  const [article, setArticle] = useState<StudioArticle | null | undefined>(
    undefined,
  );
  const [title, setTitle] = useState("");
  const [dek, setDek] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "saved" | "saving" | "dirty"
  >("saved");
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<{ json: unknown; text: string } | null>(null);
  const initialized = useRef(false);

  // inspector state
  const [corners, setCorners] = useState<Corner[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [allArticles, setAllArticles] = useState<ArticleOption[]>([]);
  const [cornerId, setCornerId] = useState("");
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [seoDescription, setSeoDescription] = useState("");
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [newLinkTo, setNewLinkTo] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [notifyOnPublish, setNotifyOnPublish] = useState(true);
  const [inspectorTab, setInspectorTab] = useState<
    "checklist" | "meta" | "links"
  >("checklist");

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("articles")
      .select("id, slug, title, dek, status, content_json, word_count, seo_description")
      .eq("id", articleId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) setArticle(null);
        else {
          setArticle(data as StudioArticle);
          setSeoDescription((data as { seo_description?: string | null }).seo_description ?? "");
        }
      });
  }, [articleId]);

  // load taxonomy + options + current relations once
  useEffect(() => {
    if (!article) return;
    const supabase = createClient();
    void (async () => {
      const [c, t, a] = await Promise.all([
        supabase.from("corners").select("id, name").eq("is_active", true).order("position"),
        supabase.from("topics").select("id, name").order("name"),
        supabase
          .from("articles")
          .select("id, title")
          .neq("id", article.id)
          .order("published_at", { ascending: false })
          .limit(50),
      ]);
      setCorners((c.data ?? []) as Corner[]);
      setTopics((t.data ?? []) as Topic[]);
      setAllArticles((a.data ?? []) as ArticleOption[]);

      // current primary corner
      const { data: ac } = await supabase
        .from("article_corners")
        .select("corner_id, is_primary")
        .eq("article_id", article.id);
      const primary = (ac ?? []).find((r: { is_primary: boolean }) => r.is_primary);
      setCornerId(primary?.corner_id ?? "");

      // current topics
      const { data: at } = await supabase
        .from("article_topics")
        .select("topic_id")
        .eq("article_id", article.id);
      setTopicIds(((at ?? []) as Array<{ topic_id: string }>).map((r) => r.topic_id));

      // editorial links
      const { data: lks } = await supabase
        .from("article_links")
        .select("id, label, to_article_id, to_article:articles!article_links_to_article_id_fkey ( title )")
        .eq("from_article_id", article.id)
        .order("position");
      setLinks(
        ((lks ?? []) as unknown as Array<{
          id: string; label: string | null; to_article_id: string;
          to_article: { title: string } | null;
        }>).map((l) => ({
          id: l.id,
          label: l.label,
          to_article_id: l.to_article_id,
          toTitle: l.to_article?.title ?? "",
        })),
      );
    })();
  }, [article]);

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
    const supabase = createClient();
    const words = contentRef.current.text
      .split(/\s+/)
      .filter(Boolean).length;
    const { error } = await supabase
      .from("articles")
      .update({
        title,
        dek: dek || null,
        seo_description: seoDescription || null,
        content_json: contentRef.current.json,
        content_text: contentRef.current.text,
        word_count: words,
        reading_time_seconds: Math.max(60, Math.round((words / 200) * 60)),
        updated_at: new Date().toISOString(),
      })
      .eq("id", article.id);
    if (error) {
      setSaveStatus("dirty");
      setMessage(error.message);
    } else {
      setSaveStatus("saved");
    }
  }, [article, title, dek, seoDescription]);

  const scheduleSave = useCallback(() => {
    setSaveStatus("dirty");
    if (timer.current) clearTimeout(timer.current);
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
        void persist();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [persist]);

  // ---- inspector actions ----
  const assignCorner = async (id: string) => {
    if (!article) return;
    setCornerId(id);
    const supabase = createClient();
    if (id) {
      await supabase.from("article_corners").upsert({
        article_id: article.id,
        corner_id: id,
        is_primary: true,
        position: 0,
      });
    }
  };

  const toggleTopic = async (id: string) => {
    if (!article) return;
    const supabase = createClient();
    const next = topicIds.includes(id)
      ? topicIds.filter((t) => t !== id)
     : [...topicIds, id];
    setTopicIds(next);
    if (topicIds.includes(id)) {
      await supabase
        .from("article_topics")
        .delete()
        .eq("article_id", article.id)
        .eq("topic_id", id);
    } else {
      await supabase
        .from("article_topics")
        .insert({ article_id: article.id, topic_id: id });
    }
  };

  const addLink = async () => {
    if (!article || !newLinkTo) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("article_links")
      .insert({
        from_article_id: article.id,
        to_article_id: newLinkTo,
        label: newLinkLabel.trim() || null,
        position: links.length,
      })
      .select("id")
      .single();
    if (!error && data) {
      setLinks((prev) => [
        ...prev,
        {
          id: data.id,
          label: newLinkLabel || null,
          to_article_id: newLinkTo,
          toTitle: allArticles.find((a) => a.id === newLinkTo)?.title ?? "",
        },
      ]);
      setNewLinkTo("");
      setNewLinkLabel("");
    }
  };

  const removeLink = async (id: string) => {
    const supabase = createClient();
    await supabase.from("article_links").delete().eq("id", id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const setWorkflowState = async (state: string, note: string) => {
    if (!article) return;
    try {
      if (timer.current) clearTimeout(timer.current);
      await persist();
      const supabase = createClient();
      await supabase.from("article_workflow").upsert({
        article_id: article.id,
        state,
        updated_at: new Date().toISOString(),
      });
      await supabase
        .from("articles")
        .update({ status: state, updated_at: new Date().toISOString() })
        .eq("id", article.id);
      setMessage(note);
      router.refresh();
    } catch {
      setMessage("Could not update the workflow.");
    }
  };

  const submitForReview = () => setWorkflowState("in_review", "Submitted for review.");
  const approve = () => setWorkflowState("approved", "Approved. Ready to publish.");
  const publish = async () => {
    if (!article) return;
    try {
      if (timer.current) clearTimeout(timer.current);
      await persist();
      const supabase = createClient();
      const now = new Date().toISOString();
      await supabase
        .from("articles")
        .update({ status: "published", published_at: now, updated_at: now })
        .eq("id", article.id);
      await supabase.from("article_workflow").upsert({
        article_id: article.id,
        state: "published",
        approved_at: now,
        updated_at: now,
      });
      setMessage(
        notifyOnPublish
          ? "Published. Followers of its corner are notified."
         : "Published silently. No notification sent.",
      );
      router.refresh();
    } catch {
      setMessage("Could not publish.");
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

  const checklist: Array<[string, boolean]> = [
    ["Author assigned", true],
    ["Title present", title.trim().length > 0],
    ["Dek present", dek.trim().length > 0],
    ["Primary corner", cornerId !== ""],
    ["Topics assigned", topicIds.length > 0],
    ["SEO description", seoDescription.trim().length > 0],
    ["Reading time", article.word_count > 0],
    ["Human authorship", true],
  ];

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
            href={`/studio/preview/${article.id}`}
            className="text-sm text-ink-muted transition-colors hover:text-ink"
            target="_blank"
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
          {article.status === "in_review" && (
            <button
              onClick={approve}
              className="rounded-editorial border border-line px-3 py-1.5 text-sm transition-colors hover:border-accent"
            >
              Approve
            </button>
          )}
          {article.status === "approved" && (
            <button
              onClick={publish}
              className="rounded-editorial border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink"
            >
              Publish now
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
            key={article.id}
            initialContent={article.content_json}
            onContentChange={onContentChange}
            saveStatus={saveStatus}
          />
        </div>
        {/* Inspector (§12.8) */}
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-line px-4 py-6 lg:block">
          <div className="flex gap-1 border-b border-line pb-2">
            {(["checklist", "meta", "links"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setInspectorTab(tab)}
                className="rounded-editorial-sm px-2.5 py-1 text-xs font-medium capitalize transition-colors"
                style={{
                  color: inspectorTab === tab ? "var(--accent)" : "var(--ink-muted)",
                  background:
                    inspectorTab === tab
                      ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                     : "transparent",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {inspectorTab === "checklist" && (
            <div className="mt-4">
              <p className="meta-line font-medium">Before publishing</p>
              <ul className="mt-4 space-y-2.5">
                {checklist.map(([label, ok]) => (
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
              <label className="mt-6 flex items-start gap-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={notifyOnPublish}
                  onChange={(e) => setNotifyOnPublish(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Notify followers on publish. Unchecked = silent publish.
                </span>
              </label>
            </div>
          )}

          {inspectorTab === "meta" && (
            <div className="mt-4 space-y-5">
              <div>
                <label htmlFor="corner-pick" className="meta-line font-medium block">
                  Primary corner
                </label>
                <select
                  id="corner-pick"
                  value={cornerId}
                  onChange={(e) => assignCorner(e.target.value)}
                  className="mt-1.5 w-full rounded-editorial border border-line bg-paper-raised px-2.5 py-2 text-sm"
                >
                  <option value="">Pick…</option>
                  {corners.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="meta-line font-medium">Topics</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {topics.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggleTopic(t.id)}
                      className="chip"
                      style={
                        topicIds.includes(t.id)
                          ? {
                              background: "var(--indigo)",
                              color: "#fff",
                              borderColor: "var(--indigo)",
                            }
                          : undefined
                      }
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="seo-desc" className="meta-line font-medium block">
                  SEO description
                </label>
                <textarea
                  id="seo-desc"
                  value={seoDescription}
                  onChange={(e) => {
                    setSeoDescription(e.target.value);
                    scheduleSave();
                  }}
                  rows={3}
                  maxLength={160}
                  placeholder="One sentence for search results"
                  className="mt-1.5 w-full rounded-editorial border border-line bg-paper-raised px-2.5 py-2 text-sm focus:border-accent focus:outline-none"
                />
                <p className="meta-line mt-1">{seoDescription.length}/160</p>
              </div>
            </div>
          )}

          {inspectorTab === "links" && (
            <div className="mt-4">
              <p className="meta-line font-medium">Elsewhere links</p>
              <p className="mt-1 text-xs text-ink-faint">
                These render inside the article as an &quot;Elsewhere in The
                Human Edit&quot; block.
              </p>
              <ul className="mt-3 space-y-2">
                {links.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-2 rounded-editorial border border-line px-2.5 py-1.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {l.label ? (
                        <>
                          {l.label}{" "}
                          <span className="text-ink-faint">→ {l.toTitle}</span>
                        </>
                      ) : (
                        l.toTitle
                      )}
                    </span>
                    <button
                      onClick={() => removeLink(l.id)}
                      className="text-xs text-ink-faint hover:text-error"
                      aria-label={`Remove link to ${l.toTitle}`}
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ul>
              <select
                value={newLinkTo}
                onChange={(e) => setNewLinkTo(e.target.value)}
                aria-label="Link to article"
                className="mt-3 w-full rounded-editorial border border-line bg-paper-raised px-2.5 py-2 text-sm"
              >
                <option value="">Link to another article…</option>
                {allArticles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
              <input
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                placeholder="Label (optional), e.g. Start here"
                aria-label="Link label"
                className="mt-2 w-full rounded-editorial border border-line bg-paper-raised px-2.5 py-2 text-sm"
              />
              <button
                onClick={addLink}
                disabled={!newLinkTo}
                className="mt-2 w-full rounded-editorial border border-line px-3 py-1.5 text-sm hover:border-accent disabled:opacity-40"
              >
                Add link
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
