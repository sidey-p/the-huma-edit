"use client";

/**
 * §admin alerts : push custom notifications to readers.
 * Silent publish (no notification) happens in WriterDesk by skipping
 * the alert checkbox; this page is for deliberate pushes + offers.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type Profile = { id: string; username: string | null; full_name: string | null; role: string };

export default function AlertsAdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [target, setTarget] = useState<"all" | "one">("all");
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setDenied(true);
        setLoading(false);
        return;
      }
      const { data: me } = await supabase
        .from("profiles")
        .select("role")
        .maybeSingle();
      if (!me || me.role === "reader") {
        setDenied(true);
        setLoading(false);
        return;
      }
      // notification rows are user-scoped: we push to all profiles we can see.
      // Profiles RLS allows selecting only self, so admin uses the full list
      // via the same RLS… we list our own + seed profiles via authors page.
      // For push we need user ids: editors can read all profiles via this RPC.
      const { data: rows } = await supabase
        .from("profiles")
        .select("id, username, full_name, role");
      if (rows) setProfiles(rows as Profile[]);
      setLoading(false);
    });
  }, []);

  const push = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const recipients =
        target === "all"
          ? profiles.map((p) => p.id)
          : selected
            ? [selected]
            : [];
    if (recipients.length === 0) {
      setMsg("No recipients available.");
      setBusy(false);
      return;
    }
    const { error } = await supabase.from("notifications").insert(
      recipients.map((uid) => ({
        user_id: uid,
        kind: "custom",
        title: title.trim(),
        body: body.trim() || null,
        url: url.trim() || null,
      })),
    );
    setMsg(
      error
        ? `Could not push: ${error.message}`
       : `Sent to ${recipients.length} reader${recipients.length === 1 ? "" : "s"}.`,
    );
    if (!error) {
      setTitle("");
      setBody("");
      setUrl("");
    }
    setBusy(false);
  };

  if (loading) return <p className="p-10 text-ink-muted">Loading…</p>;
  if (denied)
    return (
      <div className="p-10">
        <p className="font-display text-2xl">Editor access required.</p>
        <p className="mt-2 text-ink-muted">
          Pushing alerts is for editors and admins.
        </p>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="display-lg">Push an alert</h1>
      <p className="meta-line mt-1">
        Lands in the reader&apos;s notification bell. Use sparingly, like a
        good editor.
      </p>

      <div className="mt-8 space-y-4">
        <div>
          <label htmlFor="alert-title" className="meta-line block">
            Title
          </label>
          <input
            id="alert-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="New: The Story Corner opens"
            className="mt-2 w-full rounded-editorial border border-line bg-paper-raised px-3.5 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="alert-body" className="meta-line block">
            Body
          </label>
          <textarea
            id="alert-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="One line about why it matters."
            className="mt-2 w-full rounded-editorial border border-line bg-paper-raised px-3.5 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="alert-url" className="meta-line block">
            Link (optional)
          </label>
          <input
            id="alert-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/corners/story"
            className="mt-2 w-full rounded-editorial border border-line bg-paper-raised px-3.5 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="meta-line flex items-center gap-2">
            <input
              type="radio"
              name="target"
              checked={target === "all"}
              onChange={() => setTarget("all")}
            />
            All readers ({profiles.length})
          </label>
          <label className="meta-line flex items-center gap-2">
            <input
              type="radio"
              name="target"
              checked={target === "one"}
              onChange={() => setTarget("one")}
            />
            One reader
          </label>
          {target === "one" && (
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              aria-label="Pick a reader"
              className="rounded-editorial border border-line bg-paper-raised px-2.5 py-1.5 text-sm"
            >
              <option value="">Pick…</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.username ?? p.full_name ?? p.id.slice(0, 8)}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={push}
          disabled={busy || !title.trim()}
          className="rounded-editorial border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink disabled:opacity-40"
        >
          {busy ? "Sending…" : "Send alert"}
        </button>
        {msg && <p className="meta-line">{msg}</p>}
      </div>

      <p className="mt-10 text-sm text-ink-muted">
        To publish an article quietly (no notification), just publish it:
        alerts only go to readers who follow that corner.
      </p>
    </div>
  );
}
