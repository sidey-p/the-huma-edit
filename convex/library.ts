import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireSession } from "./lib/permissions";

/**
 * THE HUMAN EDIT - Reader Library (section 10)
 * Saves, collections, reading progress, history, highlights.
 * Every function is session-scoped: readers only touch their own data.
 */

// ---------- saves (10.1) ----------

export const toggleSave = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx);
    const existing = await ctx.db
      .query("savedArticles")
      .withIndex("by_user_article", (q) =>
        q.eq("userId", session.userId as never).eq("articleId", args.articleId),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    }
    await ctx.db.insert("savedArticles", {
      userId: session.userId as never,
      articleId: args.articleId,
      createdAt: Date.now(),
    });
    return { saved: true };
  },
});

export const listSaved = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const saves = await ctx.db
      .query("savedArticles")
      .withIndex("by_user", (q) => q.eq("userId", userId as never))
      .order("desc")
      .collect();

    const out = [];
    for (const s of saves) {
      const a = await ctx.db.get(s.articleId);
      if (!a || a.status !== "published") continue;
      const join = await ctx.db
        .query("articleCorners")
        .withIndex("by_article", (q) => q.eq("articleId", a._id))
        .first();
      const corner = join ? await ctx.db.get(join.cornerId) : null;
      out.push({
        _id: a._id,
        slug: a.slug,
        title: a.title,
        dek: a.dek ?? null,
        readingTimeSeconds: a.readingTimeSeconds,
        publishedAt: a.publishedAt ?? null,
        savedAt: s.createdAt,
        cornerName: corner?.name ?? null,
      });
    }
    return out;
  },
});

export const isSaved = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const existing = await ctx.db
      .query("savedArticles")
      .withIndex("by_user_article", (q) =>
        q.eq("userId", userId as never).eq("articleId", args.articleId),
      )
      .unique();
    return !!existing;
  },
});

// ---------- collections (10.2) ----------

export const listCollections = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("collections")
      .withIndex("by_user", (q) => q.eq("userId", userId as never))
      .collect();
  },
});

export const createCollection = mutation({
  args: { name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx);
    const count = await ctx.db
      .query("collections")
      .withIndex("by_user", (q) => q.eq("userId", session.userId as never))
      .collect();
    return await ctx.db.insert("collections", {
      userId: session.userId as never,
      name: args.name,
      description: args.description,
      position: count.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ---------- reading progress (10.4) + history ----------

export const updateReadingProgress = mutation({
  args: {
    articleId: v.id("articles"),
    progressPercent: v.number(),
    scrollAnchor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx);
    const now = Date.now();
    const percent = Math.max(0, Math.min(100, args.progressPercent));

    const existing = await ctx.db
      .query("readingProgress")
      .withIndex("by_user_article", (q) =>
        q.eq("userId", session.userId as never).eq("articleId", args.articleId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        progressPercent: percent,
        scrollAnchor: args.scrollAnchor,
        lastReadAt: now,
        completedAt: percent >= 95 ? now : existing.completedAt,
      });
    } else {
      await ctx.db.insert("readingProgress", {
        userId: session.userId as never,
        articleId: args.articleId,
        progressPercent: percent,
        scrollAnchor: args.scrollAnchor,
        lastReadAt: now,
        completedAt: percent >= 95 ? now : undefined,
      });
      // history entry (10.4)
      await ctx.db.insert("readingHistory", {
        userId: session.userId as never,
        articleId: args.articleId,
        startedAt: now,
        lastSeenAt: now,
        secondsRead: 0,
      });
    }

    // keep history lastSeenAt fresh
    const hist = await ctx.db
      .query("readingHistory")
      .withIndex("by_user_article", (q) =>
        q.eq("userId", session.userId as never).eq("articleId", args.articleId),
      )
      .first();
    if (hist) {
      await ctx.db.patch(hist._id, { lastSeenAt: now });
    }
  },
});

export const getReadingProgress = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return (
      (
        await ctx.db
          .query("readingProgress")
          .withIndex("by_user_article", (q) =>
            q.eq("userId", userId as never).eq("articleId", args.articleId),
          )
          .unique()
      ) ?? null
    );
  },
});

/** Continue-reading shelf (10.5): in-progress, newest first, with percent. */
export const listContinueReading = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("readingProgress")
      .withIndex("by_user_recent", (q) => q.eq("userId", userId as never))
      .order("desc")
      .take(10);

    const out = [];
    for (const r of rows) {
      if (r.completedAt || r.progressPercent < 1) continue;
      const a = await ctx.db.get(r.articleId);
      if (!a || a.status !== "published") continue;
      out.push({
        _id: a._id,
        slug: a.slug,
        title: a.title,
        progressPercent: r.progressPercent,
        scrollAnchor: r.scrollAnchor ?? null,
        lastReadAt: r.lastReadAt,
      });
    }
    return out.slice(0, 6);
  },
});

/** Full history (10.4). */
export const listHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("readingHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId as never))
      .order("desc")
      .take(50);

    const out = [];
    for (const r of rows) {
      const a = await ctx.db.get(r.articleId);
      if (!a || a.status !== "published") continue;
      const progress = await ctx.db
        .query("readingProgress")
        .withIndex("by_user_article", (q) =>
          q.eq("userId", userId as never).eq("articleId", r.articleId),
        )
        .unique();
      out.push({
        _id: a._id,
        slug: a.slug,
        title: a.title,
        lastSeenAt: r.lastSeenAt,
        progressPercent: progress?.progressPercent ?? 0,
        completed: !!progress?.completedAt,
      });
    }
    return out;
  },
});

// ---------- highlights (10.3) ----------

export const createHighlight = mutation({
  args: {
    articleId: v.id("articles"),
    selectedText: v.string(),
    note: v.optional(v.string()),
    style: v.optional(
      v.union(
        v.literal("yellow"), v.literal("green"), v.literal("blue"),
        v.literal("pink"), v.literal("underline"),
      ),
    ),
    anchor: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx);
    // Pin to the latest revision so highlights survive edits (10.3)
    const latest = await ctx.db
      .query("articleRevisions")
      .withIndex("by_article_number", (q) => q.eq("articleId", args.articleId))
      .order("desc")
      .first();
    const now = Date.now();
    return await ctx.db.insert("highlights", {
      userId: session.userId as never,
      articleId: args.articleId,
      revisionId: latest?._id,
      selectedText: args.selectedText,
      anchor: args.anchor ?? {},
      note: args.note,
      style: args.style ?? "yellow",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listMyHighlights = query({
  args: { articleId: v.optional(v.id("articles")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("highlights")
      .withIndex("by_user", (q) => q.eq("userId", userId as never))
      .order("desc")
      .collect();
    const out = [];
    for (const h of rows) {
      if (args.articleId && h.articleId !== args.articleId) continue;
      const a = await ctx.db.get(h.articleId);
      out.push({
        _id: h._id,
        articleId: h.articleId,
        articleTitle: a?.title ?? "—",
        articleSlug: a?.slug ?? "",
        selectedText: h.selectedText,
        note: h.note ?? null,
        style: h.style,
        createdAt: h.createdAt,
      });
    }
    return out;
  },
});

export const deleteHighlight = mutation({
  args: { highlightId: v.id("highlights") },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx);
    const h = await ctx.db.get(args.highlightId);
    if (!h || h.userId !== (session.userId as never)) {
      throw new Error("Not your highlight.");
    }
    await ctx.db.delete(args.highlightId);
  },
});
