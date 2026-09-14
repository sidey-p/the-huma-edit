"use client";

/**
 * §05.7 topics manager : add/edit topics and connect articles to topics.
 * Editors control taxonomy without code (§55 Editors).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

type Topic = { id: string; slug: string; name: string; description: string | null };
type Article = { id: string; title: string; slug: string };

export default function TopicsAdminPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [assignTopic, setAssignTopic] = useState("");
  const [assignArticle, setAssignArticle] = useState("");

  const load = async () => {
    const supabase = createClient();
    const [{ data: t }, { data: a }] = await Promise.all([
      supabase.from("topics").select("id, slug, name, description").order("name"),
      supabase
        .from("articles")
        .select("id, title, slug")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(60),
    ]);
    setTopics((t ?? []) as Topic[]);
    setArticles((a ?? []) as Article[]);
    setLoading(false);
  };

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data: me } = await supabase.from("profiles").select("role").maybeSingle();
      if (!me || me.role === "reader") {
        setDenied(true);
        setLoading(false);
        return;
      }
      await load();
    })();
  }, []);

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `topic-${Date.now()}`;

  const addTopic = async () => {
    if (!newName.trim() || busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("topics").insert({
      name: newName.trim(),
      slug: slugify(newName.trim()),
    });
    setMsg(error ? error.message : "Topic added.");
    setNewName("");
    await load();
    setBusy(false);
  };

  const update = async (id: string, patch: Partial<Topic>) => {
    const supabase = createClient();
    await supabase.from("topics").update(patch).eq("id", id);
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const remove = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("topics").delete().eq("id", id);
    if (error) {
      setMsg(error.message);
      return;
    }
    setTopics((prev) => prev.filter((t) => t.id !== id));
    setMsg("Topic removed. Articles stay; only the thread is cut.");
  };

  const assign = async () => {
    if (!assignTopic || !assignArticle || busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("article_topics")
      .insert({ topic_id: assignTopic, article_id: assignArticle });
    setMsg(
        error
          ? error.message.includes("duplicate")
            ? "Already connected."
            : error.message
          : "Article connected to topic. Its chips now lead readers there.",
    );
    setAssignArticle("");
    setBusy(false);
  };

  if (loading) return <p className="p-10 text-ink-muted">Loading topics…</p>;
  if (denied) return <p className="p-10 text-ink-muted">Editor access required.</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="display-lg">Topics</h1>
      <p className="meta-line mt-1">
        Threads across corners. Article chips link readers to these pages.
      </p>

      <div className="mt-8 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New topic, e.g. Attention"
          aria-label="New topic name"
          className="w-full rounded-editorial border border-line bg-paper-raised px-3.5 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          onClick={addTopic}
          disabled={busy || !newName.trim()}
          className="shrink-0 rounded-editorial border border-accent bg-accent px-4 py-2 text-sm font-medium text-accent-ink disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {msg && <p className="meta-line mt-3">{msg}</p>}

      {/* connect an article to a topic */}
      <section className="corner-card mt-8">
        <h2 className="font-display text-lg">Connect an article</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={assignArticle}
            onChange={(e) => setAssignArticle(e.target.value)}
            aria-label="Article"
            className="min-w-52 flex-1 rounded-editorial border border-line bg-paper-raised px-3 py-2 text-sm"
          >
            <option value="">Pick an article…</option>
            {articles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
          <select
            value={assignTopic}
            onChange={(e) => setAssignTopic(e.target.value)}
            aria-label="Topic"
            className="min-w-40 rounded-editorial border border-line bg-paper-raised px-3 py-2 text-sm"
          >
            <option value="">Pick a topic…</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            onClick={assign}
            disabled={!assignArticle || !assignTopic || busy}
            className="rounded-editorial border border-line px-4 py-2 text-sm hover:border-accent disabled:opacity-40"
          >
            Connect
          </button>
        </div>
      </section>

      <ul className="mt-8 space-y-3">
        {topics.map((t) => (
          <li key={t.id} className="composer-section">
            <input
              value={t.name}
              onChange={(e) => update(t.id, { name: e.target.value })}
              aria-label={`${t.name} display name`}
              className="min-w-0 flex-1 rounded-editorial-sm border border-line bg-transparent px-2.5 py-1.5 font-display text-lg focus:border-accent focus:outline-none"
            />
            <Link
              href={`/topics/${t.slug}`}
              className="meta-line underline"
              target="_blank"
            >
              view
            </Link>
            <button
              onClick={() => remove(t.id)}
              className="rounded-editorial border border-line px-2.5 py-1 text-xs hover:border-error hover:text-error"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <details className="mt-8">
        <summary className="meta-line cursor-pointer">Edit descriptions</summary>
        <ul className="mt-4 space-y-4">
          {topics.map((t) => (
            <li key={t.id}>
              <label className="meta-line block" htmlFor={`tdesc-${t.id}`}>
                {t.name}
              </label>
              <textarea
                id={`tdesc-${t.id}`}
                defaultValue={t.description ?? ""}
                onBlur={(e) => update(t.id, { description: e.target.value })}
                rows={2}
                className="mt-1.5 w-full rounded-editorial border border-line bg-paper-raised px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
