"use client";

/**
 * §05/§12 - Corners manager: add, edit, reorder, activate/deactivate
 * the editorial worlds. RLS-gated to editors.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type Corner = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  position: number;
  is_active: boolean;
};

export default function CornersAdminPage() {
  const [corners, setCorners] = useState<Corner[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const load = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("corners")
      .select("*")
      .order("position");
    if (error) setDenied(true);
    else setCorners((data ?? []) as unknown as Corner[]);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("corners")
        .select("*")
        .order("position");
      if (cancelled) return;
      if (error) setDenied(true);
      else setCorners((data ?? []) as unknown as Corner[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addCorner = async () => {
    if (!newName.trim() || busy) return;
    setBusy(true);
    const supabase = createClient();
    const slug = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("corners").insert({
      name: newName.trim(),
      slug,
      position: corners.length + 1,
      is_active: true,
    });
    setMsg(error ? error.message : "Corner added.");
    setNewName("");
    await load();
    setBusy(false);
  };

  const update = async (id: string, patch: Partial<Corner>) => {
    const supabase = createClient();
    await supabase.from("corners").update(patch).eq("id", id);
    setCorners((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = corners.findIndex((c) => c.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= corners.length) return;
    const a = corners[idx];
    const b = corners[swap];
    const supabase = createClient();
    await Promise.all([
      supabase.from("corners").update({ position: b.position }).eq("id", a.id),
      supabase.from("corners").update({ position: a.position }).eq("id", b.id),
    ]);
    await load();
  };

  if (loading) return <p className="p-10 text-ink-muted">Loading corners…</p>;
  if (denied) return <p className="p-10 text-ink-muted">Editor access required.</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="display-lg">Corners</h1>
      <p className="meta-line mt-1">
        Add, arrange, edit the editorial worlds. Order shows on the site.
      </p>

      <div className="mt-8 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New corner name, e.g. The Music Corner"
          aria-label="New corner name"
          className="w-full rounded-editorial border border-line bg-paper-raised px-3.5 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          onClick={addCorner}
          disabled={busy || !newName.trim()}
          className="shrink-0 rounded-editorial border border-accent bg-accent px-4 py-2 text-sm font-medium text-accent-ink disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {msg && <p className="meta-line mt-3">{msg}</p>}

      <ul className="mt-8 space-y-3">
        {corners.map((c, i) => (
          <li key={c.id} className="composer-section">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => move(c.id, -1)}
                disabled={i === 0}
                aria-label={`Move ${c.name} up`}
                className="icon-btn"
                style={{ width: "1.8rem", height: "1.8rem" }}
              >
                ↑
              </button>
              <button
                onClick={() => move(c.id, 1)}
                disabled={i === corners.length - 1}
                aria-label={`Move ${c.name} down`}
                className="icon-btn"
                style={{ width: "1.8rem", height: "1.8rem" }}
              >
                ↓
              </button>
            </div>
            <input
              value={c.name}
              onChange={(e) => update(c.id, { name: e.target.value })}
              aria-label={`${c.name} display name`}
              className="min-w-0 flex-1 rounded-editorial-sm border border-line bg-transparent px-2.5 py-1.5 font-display text-lg focus:border-accent focus:outline-none"
            />
            <label className="meta-line flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={c.is_active}
                onChange={(e) => update(c.id, { is_active: e.target.checked })}
              />
              active
            </label>
          </li>
        ))}
      </ul>

      <details className="mt-8">
        <summary className="meta-line cursor-pointer">Edit descriptions</summary>
        <ul className="mt-4 space-y-4">
          {corners.map((c) => (
            <li key={c.id}>
              <label className="meta-line block" htmlFor={`desc-${c.id}`}>
                {c.name}
              </label>
              <textarea
                id={`desc-${c.id}`}
                defaultValue={c.description ?? ""}
                onBlur={(e) => update(c.id, { description: e.target.value })}
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
