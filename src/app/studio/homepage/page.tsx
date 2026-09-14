"use client";

/**
 * §15 Homepage composer : arrange the public homepage sections.
 * Drag-free (keyboard accessible): up/down reorder + toggles.
 * Sections stored in homepage_config (jsonb).
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type Section = { type: string; visible?: boolean };

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero - Read something worth your time",
  edit: "The Edit: editor's picks",
  corners: "Corners: six folded cards",
  "new-writing": "New writing: newspaper list",
  paths: "Reading Paths spotlight",
  vocabulary: "Word of the day",
};
const ALL_SECTIONS = Object.keys(SECTION_LABELS);

export default function HomepageAdminPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("homepage_config")
        .select("id, sections")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setDenied(true);
      } else {
        setSections(
          (data?.sections as Section[] | null) ?? [
            { type: "hero" },
            { type: "edit" },
            { type: "corners" },
            { type: "new-writing" },
          ],
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (next: Section[]) => {
    setSections(next);
    const supabase = createClient();
    const { data: existing } = await supabase
      .from("homepage_config")
      .select("id")
      .limit(1)
      .maybeSingle();
    const row = existing as { id: string } | null;
    const { error } = row
      ? await supabase
          .from("homepage_config")
          .update({ sections: next, updated_at: new Date().toISOString() })
          .eq("id", row.id)
     : await supabase.from("homepage_config").insert({ sections: next });
    setMsg(error ? error.message : "Homepage layout saved.");
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    void save(next);
  };

  const toggleVisible = (i: number) => {
    const next = [...sections];
    next[i] = { ...next[i], visible: next[i].visible === false };
    void save(next);
  };

  const remove = (i: number) => {
    void save(sections.filter((_, idx) => idx !== i));
  };

  const add = (type: string) => {
    if (sections.find((s) => s.type === type)) return;
    void save([...sections, { type }]);
  };

  if (loading) return <p className="p-10 text-ink-muted">Loading homepage…</p>;
  if (denied) return <p className="p-10 text-ink-muted">Editor access required.</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="display-lg">Homepage composer</h1>
      <p className="meta-line mt-1">
        Arrange the public homepage. Order here is order on the site.
      </p>

      <a
        href="/"
        target="_blank"
        rel="noreferrer"
        className="btn btn-ghost mt-4"
        style={{ padding: "0.5rem 1rem", fontSize: "var(--step--1)" }}
      >
        Preview the homepage ↗
      </a>

      {msg && <p className="meta-line mt-3">{msg}</p>}

      <ol className="mt-8 space-y-3">
        {sections.map((s, i) => (
          <li key={s.type} className="composer-section">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move section up"
                className="icon-btn"
                style={{ width: "1.8rem", height: "1.8rem" }}
              >
                ↑
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === sections.length - 1}
                aria-label="Move section down"
                className="icon-btn"
                style={{ width: "1.8rem", height: "1.8rem" }}
              >
                ↓
              </button>
            </div>
            <p className="min-w-0 flex-1 text-sm font-medium">
              {SECTION_LABELS[s.type] ?? s.type}
              {s.visible === false && (
                <span className="meta-line ml-2">hidden</span>
              )}
            </p>
            <button
              onClick={() => toggleVisible(i)}
              className="rounded-editorial border border-line px-2.5 py-1 text-xs transition-colors hover:border-accent"
            >
              {s.visible === false ? "Show" : "Hide"}
            </button>
            <button
              onClick={() => remove(i)}
              className="rounded-editorial border border-line px-2.5 py-1 text-xs transition-colors hover:border-error hover:text-error"
            >
              Remove
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-10">
        <p className="meta-line font-medium">Add a section</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ALL_SECTIONS.filter((t) => !sections.find((s) => s.type === t)).map(
            (t) => (
              <button key={t} onClick={() => add(t)} className="chip">
                + {SECTION_LABELS[t].split(" : ")[0]}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
