"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

/**
 * Notification bell + drop panel (§notifications).
 * Shows unread dot, mark-all-read, links to articles.
 */
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [items, setItems] = useState<
    Array<{
      id: string;
      kind: string;
      title: string;
      body: string | null;
      url: string | null;
      is_read: boolean;
      created_at: string;
    }>
  >([]);
  const [unread, setUnread] = useState(0);
  const hostRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setSignedIn(true);
      supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }) => {
          const rows = (data ?? []) as typeof items;
          setItems(rows);
          setUnread(rows.filter((r) => !r.is_read).length);
        });
    });
  }, []);

  const markAllRead = async () => {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("is_read", false);
    setUnread(0);
    setItems((prev) => prev.map((p) => ({ ...p, is_read: true })));
  };

  if (!signedIn) return null;

  return (
    <span className="notif-host relative inline-flex" ref={hostRef}>
      <button
        className="icon-btn"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        data-notif-open={open}
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) void markAllRead();
        }}
      >
        <span className="relative inline-grid place-items-center">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {unread > 0 && <span className="notif-dot" aria-hidden="true" />}
        </span>
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <p className="meta-line font-medium">Notifications</p>
            {items.length > 0 && (
              <button onClick={markAllRead} className="meta-line text-accent">
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="notif-body px-4 py-6 text-center">
              Quiet for now. New pieces and notes will land here.
            </p>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                href={n.url ?? "#"}
                className={`notif-row ${n.is_read ? "" : "unread"}`}
                onClick={() => setOpen(false)}
              >
                <p className="notif-title">{n.title}</p>
                {n.body && <p className="notif-body">{n.body}</p>}
                <p className="notif-time">
                  {new Date(n.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </Link>
            ))
          )}
        </div>
      )}
    </span>
  );
}
