"use client";

/**
 * §comments : threaded discussion under articles.
 * Username + avatar from profiles; guests get a sign-in prompt.
 * One nesting level (thread), like old editorial letters pages.
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  parent_comment_id: string | null;
  is_pinned: boolean;
  user_id: string;
  profiles: { username: string | null; full_name: string | null; avatar_base64: string | null } | null;
  replies?: CommentRow[];
};

type ProfileMap = Record<string, { username: string | null; full_name: string | null; avatar_base64: string | null }>;

export function Comments({ articleId }: { articleId: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const [me, setMe] = useState<ProfileMap[string] | null>(null);
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("comments")
      .select("id, body, created_at, parent_comment_id, is_pinned, user_id, profiles ( username, full_name, avatar_base64 )")
      .eq("article_id", articleId)
      .order("created_at", { ascending: false })
      .limit(100);
    const flat = (data ?? []) as unknown as CommentRow[];
    // build one level of threads
    const tops = flat.filter((c) => !c.parent_comment_id);
    const withReplies = tops.map((t) => ({
      ...t,
      replies: flat.filter((c) => c.parent_comment_id === t.id),
    }));
    setRows(withReplies);
  }, [articleId]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      setSignedIn(!!user);
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("username, full_name, avatar_base64")
          .maybeSingle();
        setMe((data as ProfileMap[string]) ?? null);
      }
      void load();
    });
  }, [load]);

  const submit = async () => {
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Sign in to join the conversation.");
      setBusy(false);
      return;
    }
    const { error: insertError } = await supabase.from("comments").insert({
      article_id: articleId,
      user_id: user.id,
      body: body.trim(),
      parent_comment_id: replyTo,
    });
    if (insertError) {
      setError(insertError.message);
    } else {
      setBody("");
      setReplyTo(null);
      await load();
    }
    setBusy(false);
  };

  const avatarFor = (p: ProfileMap[string] | null) =>
    p?.avatar_base64 ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="c-avatar" src={p.avatar_base64} alt="" />
    ) : (
      <span className="c-avatar" aria-hidden="true" />
    );

  return (
    <section aria-labelledby="comments-heading" className="mt-16 border-t border-line pt-10">
      <h2 id="comments-heading" className="font-display text-2xl">
        Conversation
      </h2>
      <p className="meta-line mt-1">
        Letters to the editors and fellow readers. Be a person.
      </p>

      {/* composer */}
      {signedIn ? (
        <div className="mt-6">
          {replyTo && (
            <p className="meta-line mb-2">
              Replying to a comment ·{" "}
              <button
                className="text-accent underline"
                onClick={() => setReplyTo(null)}
              >
                cancel
              </button>
            </p>
          )}
          <div className="flex gap-3">
            {avatarFor(me)}
            <div className="min-w-0 flex-1">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add to the conversation…"
                aria-label="Write a comment"
                rows={3}
                maxLength={2000}
                className="w-full rounded-editorial border border-line bg-paper-raised px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="meta-line">{body.length}/2000</span>
                <button
                  onClick={submit}
                  disabled={busy || !body.trim()}
                  className="rounded-editorial border border-accent bg-accent px-4 py-1.5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {busy ? "Sending…" : replyTo ? "Reply" : "Post comment"}
                </button>
              </div>
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-error">{error}</p>}
        </div>
      ) : (
        <p className="mt-6 text-sm text-ink-muted">
          <Link href="/sign-in" className="text-accent underline">
            Sign in
          </Link>{" "}
          to join the conversation. Comments show your name and profile
          picture.
        </p>
      )}

      {/* threads */}
      <div className="mt-10">
        {rows.length === 0 ? (
          <p className="text-ink-muted">
            No comments yet. Say the first true thing.
          </p>
        ) : (
          rows.map((c) => (
            <CommentNode key={c.id} c={c} onReply={() => setReplyTo(c.id)} avatarFor={avatarFor} />
          ))
        )}
      </div>
    </section>
  );
}

function CommentNode({
  c,
  onReply,
  avatarFor,
}: {
  c: CommentRow;
  onReply: () => void;
  avatarFor: (p: ProfileMap[string] | null) => React.ReactNode;
}) {
  const name =
    c.profiles?.username ?? c.profiles?.full_name ?? "A reader";
  return (
    <div className="comment">
      <div className="c-head">
        {avatarFor(c.profiles)}
        <div className="min-w-0">
          <p className="c-name">{name}</p>
          <p className="c-time">
            {new Date(c.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
            {c.is_pinned ? " · pinned by editors" : ""}
          </p>
        </div>
      </div>
      <p className="c-body">{c.body}</p>
      <div className="c-actions">
        <button onClick={onReply}>Reply</button>
      </div>
      {c.replies && c.replies.length > 0 && (
        <div className="comment-thread">
          {c.replies.map((r) => (
            <div key={r.id} className="comment" style={{ borderTop: "none" }}>
              <div className="c-head">
                {avatarFor(r.profiles)}
                <div className="min-w-0">
                  <p className="c-name">
                    {r.profiles?.username ?? r.profiles?.full_name ?? "A reader"}
                  </p>
                  <p className="c-time">
                    {new Date(r.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <p className="c-body">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

