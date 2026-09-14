"use client";

/**
 * §ads studio : place ad slots inside articles visually.
 * Editors pick an article, choose top/mid/end placement, and for
 * mid-placement drag the paragraph position with a live preview of
 * where the slot will render between paragraphs.
 */

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type Article = { id: string; title: string; slug: string };
type AdRow = {
  id: string;
  article_id: string | null;
  placement: "top" | "mid" | "end";
  after_paragraph: number;
  title: string | null;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  kind: string;
  is_active: boolean;
};
type ParagraphNode = { type: string; text?: string };

export default function AdsAdminPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [articleId, setArticleId] = useState("");
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [placement, setPlacement] = useState<"top" | "mid" | "end">("mid");
  const [afterParagraph, setAfterParagraph] = useState(3);
  const [adTitle, setAdTitle] = useState("");
  const [adBody, setAdBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("/premium");
  const [kind, setKind] = useState("premium");
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data: me } = await supabase.from("profiles").select("role").maybeSingle();
      if (!me || me.role === "reader") {
        setDenied(true);
        setLoading(false);
        return;
      }
      const [{ data: artRows }, { data: adRows }] = await Promise.all([
        supabase
          .from("articles")
          .select("id, title, slug")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(50),
        supabase.from("ad_slots").select("*").order("created_at"),
      ]);
      setArticles((artRows ?? []) as Article[]);
      setAds((adRows ?? []) as AdRow[]);
      setLoading(false);
    })();
  }, []);

  // load paragraph list for chosen article (for the visual preview)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!articleId) {
        setParagraphs([]);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("articles")
        .select("content_json")
        .eq("id", articleId)
        .maybeSingle();
      if (cancelled) return;
      const doc = (data?.content_json ?? { content: [] }) as {
        content?: ParagraphNode[];
      };
      const paras = (doc.content ?? [])
        .filter((n) => n.type === "paragraph")
        .map((n) => (n.text ?? "").slice(0, 90));
      setParagraphs(paras);
      setAfterParagraph(
        Math.max(1, Math.min(3, Math.floor(paras.length / 3) || 1)),
      );
    };
    const t = setTimeout(load, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [articleId]);

  const previewIndex = useMemo(() => {
    if (placement !== "mid") return -1;
    return Math.max(1, Math.min(afterParagraph, Math.max(1, paragraphs.length)));
  }, [placement, afterParagraph, paragraphs.length]);

  const create = async () => {
    if (!articleId || busy) return;
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from("ad_slots").insert({
      article_id: articleId,
      placement,
      after_paragraph: placement === "mid" ? previewIndex : 1,
      title: adTitle.trim() || null,
      body: adBody.trim() || null,
      cta_label: ctaLabel.trim() || null,
      cta_url: ctaUrl.trim() || null,
      kind,
      is_active: true,
    });
    if (error) setMsg(`Could not save: ${error.message}`);
    else {
      setMsg("Ad slot placed. It renders on the live article.");
      setAdTitle("");
      setAdBody("");
      setCtaLabel("");
      const { data } = await supabase.from("ad_slots").select("*").order("created_at");
      setAds((data ?? []) as AdRow[]);
    }
    setBusy(false);
  };

  const toggleActive = async (ad: AdRow) => {
    const supabase = createClient();
    await supabase.from("ad_slots").update({ is_active: !ad.is_active }).eq("id", ad.id);
    setAds((prev) =>
      prev.map((a) => (a.id === ad.id ? { ...a, is_active: !a.is_active } : a)),
    );
  };

  const remove = async (ad: AdRow) => {
    const supabase = createClient();
    await supabase.from("ad_slots").delete().eq("id", ad.id);
    setAds((prev) => prev.filter((a) => a.id !== ad.id));
  };

  if (loading) return <p className="p-10 text-ink-muted">Loading ads…</p>;
  if (denied)
    return (
      <div className="p-10">
        <p className="font-display text-2xl">Editor access required.</p>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="display-lg">Ads and placements</h1>
      <p className="meta-line mt-1">
        Place a slot inside any article, exactly between the paragraphs you
        pick. Readers can go ad-free with membership.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* placement composer */}
        <section className="corner-card">
          <h2 className="font-display text-xl">Place a slot</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="ad-article" className="meta-line block">
                Article
              </label>
              <select
                id="ad-article"
                value={articleId}
                onChange={(e) => setArticleId(e.target.value)}
                className="mt-1.5 w-full rounded-editorial border border-line bg-paper-raised px-3 py-2 text-sm"
              >
                <option value="">Pick an article…</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-4">
              {(["top", "mid", "end"] as const).map((p) => (
                <label key={p} className="meta-line flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="placement"
                    checked={placement === p}
                    onChange={() => setPlacement(p)}
                  />
                  {p === "top" ? "Top" : p === "mid" ? "Between paragraphs" : "End"}
                </label>
              ))}
            </div>
            {placement === "mid" && paragraphs.length > 0 && (
              <div>
                <label htmlFor="after-p" className="meta-line block">
                  After paragraph: {previewIndex}
                </label>
                <input
                  id="after-p"
                  type="range"
                  min={1}
                  max={Math.max(1, paragraphs.length)}
                  value={previewIndex}
                  onChange={(e) => setAfterParagraph(Number(e.target.value))}
                  className="mt-2 w-full"
                  style={{ accentColor: "var(--orange)" }}
                />
                <div
                  className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-editorial border border-line bg-paper-sunken p-3"
                  aria-hidden="true"
                >
                  {paragraphs.map((p, i) => (
                    <p key={i} className="truncate text-xs text-ink-muted">
                      {i + 1 === previewIndex && (
                        <span
                          className="mr-1 font-semibold"
                          style={{ color: "var(--orange)" }}
                        >
                          ▼ slot here
                        </span>
                      )}
                      {i + 1}. {p}…
                    </p>
                  ))}
                  {paragraphs.length === previewIndex && (
                    <p className="text-xs font-semibold" style={{ color: "var(--orange)" }}>
                      ▼ slot renders after this paragraph
                    </p>
                  )}
                </div>
              </div>
            )}
            <div>
              <label htmlFor="ad-title" className="meta-line block">
                Slot headline
              </label>
              <input
                id="ad-title"
                value={adTitle}
                onChange={(e) => setAdTitle(e.target.value)}
                placeholder="Read without interruptions"
                className="mt-1.5 w-full rounded-editorial border border-line bg-paper-raised px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="ad-body" className="meta-line block">
                Body
              </label>
              <textarea
                id="ad-body"
                value={adBody}
                onChange={(e) => setAdBody(e.target.value)}
                rows={2}
                placeholder="One honest sentence about the offer."
                className="mt-1.5 w-full rounded-editorial border border-line bg-paper-raised px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cta-label" className="meta-line block">
                  CTA label
                </label>
                <input
                  id="cta-label"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="Go ad-free"
                  className="mt-1.5 w-full rounded-editorial border border-line bg-paper-raised px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="cta-url" className="meta-line block">
                  CTA link
                </label>
                <input
                  id="cta-url"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="/premium"
                  className="mt-1.5 w-full rounded-editorial border border-line bg-paper-raised px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="ad-kind" className="meta-line block">
                Kind
              </label>
              <select
                id="ad-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="mt-1.5 w-full rounded-editorial border border-line bg-paper-raised px-3 py-2 text-sm"
              >
                <option value="premium">Membership (premium)</option>
                <option value="offer">Offer</option>
                <option value="house">House notice</option>
              </select>
            </div>
            <button
              onClick={create}
              disabled={!articleId || busy}
              className="rounded-editorial border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink disabled:opacity-40"
            >
              {busy ? "Placing…" : "Place the slot"}
            </button>
            {msg && <p className="meta-line">{msg}</p>}
          </div>
        </section>

        {/* live slots list */}
        <section>
          <h2 className="font-display text-xl">Current slots</h2>
          {ads.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              No slots yet. The demo article carries one for reference.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {ads.map((ad) => (
                <li key={ad.id} className="composer-section">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {ad.title ?? "Untitled slot"}
                    </p>
                    <p className="meta-line">
                      {articles.find((a) => a.id === ad.article_id)?.title ??
                        "Global"}
                      {" · "}
                      {ad.placement === "mid"
                        ? `after para ${ad.after_paragraph}`
                       : ad.placement}
                      {ad.is_active ? "" : " · paused"}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleActive(ad)}
                    className="rounded-editorial border border-line px-2.5 py-1 text-xs hover:border-accent"
                  >
                    {ad.is_active ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => remove(ad)}
                    className="rounded-editorial border border-line px-2.5 py-1 text-xs hover:border-error hover:text-error"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
