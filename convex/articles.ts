import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  requireSession,
  requireRole,
  canEditArticle,
  assertTransition,
  audit,
  ROLE_RANK,
  type MutationCtx,
} from "./lib/permissions";

/**
 * THE HUMAN EDIT — Article CRUD + editorial workflow (§13, §26)
 */

/** Studio utility: find id by slug, then hard-delete a test article. */
export const getIdBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const a = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    return a?._id ?? null;
  },
});

export const deleteById = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const session = await requireRole(ctx, "admin");
    const joins = await ctx.db
      .query("articleCorners")
      .filter((q) => q.eq(q.field("articleId"), args.articleId))
      .collect();
    for (const j of joins) await ctx.db.delete(j._id);
    const tjoins = await ctx.db
      .query("articleTopics")
      .filter((q) => q.eq(q.field("articleId"), args.articleId))
      .collect();
    for (const j of tjoins) await ctx.db.delete(j._id);
    const revs = await ctx.db
      .query("articleRevisions")
      .filter((q) => q.eq(q.field("articleId"), args.articleId))
      .collect();
    for (const r of revs) await ctx.db.delete(r._id);
    const wf = await ctx.db
      .query("articleWorkflow")
      .filter((q) => q.eq(q.field("articleId"), args.articleId))
      .unique();
    if (wf) await ctx.db.delete(wf._id);
    await ctx.db.delete(args.articleId);
    await audit(ctx, session, "article.delete", "articles", args.articleId, null, null);
  },
});

// ---------- studio queries ----------

/** Studio draft view: content + workflow state. Session-scoped. */
export const getForStudio = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserIdForStudio(ctx);
    if (!userId) throw new Error("Sign in required.");
    const article = await ctx.db.get(args.articleId);
    if (!article) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as never))
      .unique();
    const rank = profile ? ROLE_RANK[profile.role] ?? 0 : 0;

    // Authors see only their own drafts; editors+ see everything.
    const author = article.primaryAuthorId
      ? await ctx.db.get(article.primaryAuthorId)
      : null;
    const isOwner = author?.userId === userId;
    if (rank < ROLE_RANK.editor && !isOwner) return null;

    const wf = await ctx.db
      .query("articleWorkflow")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .unique();

    // §32 publication checklist state (computed, not stored)
    const cornerJoin = await ctx.db
      .query("articleCorners")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .first();
    const topicJoins = await ctx.db
      .query("articleTopics")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .collect();
    const unresolvedComments = await ctx.db
      .query("reviewComments")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .collect()
      .then((cs) => cs.filter((c) => !c.resolvedAt).length);

    const checklist = {
      titlePresent: article.title.trim().length > 0,
      dekPresent: !!article.dek?.trim(),
      primaryCornerSelected: !!cornerJoin,
      topicAssigned: topicJoins.length > 0,
      coverImagePresent: !!article.coverAssetId,
      seoDescriptionPresent: !!article.seoDescription?.trim(),
      readingTimeCalculated: article.readingTimeSeconds > 0,
      wordCountReasonable: article.wordCount >= 100,
      humanAuthorshipAttested: article.humanAuthorshipAttested,
      noUnresolvedComments: unresolvedComments === 0,
      authorAssigned: !!article.primaryAuthorId,
    };

    return {
      _id: article._id,
      slug: article.slug,
      title: article.title,
      dek: article.dek,
      contentJson: article.contentJson,
      status: article.status,
      contentType: article.contentType,
      readingDepth: article.readingDepth,
      wordCount: article.wordCount,
      readingTimeSeconds: article.readingTimeSeconds,
      humanAuthorshipAttested: article.humanAuthorshipAttested,
      seoTitle: article.seoTitle,
      seoDescription: article.seoDescription,
      authorName: author?.displayName ?? null,
      authorSlug: author?.slug ?? null,
      workflow: wf
        ? {
            state: wf.state,
            assignedEditorId: wf.assignedEditorId,
            scheduledFor: wf.scheduledFor,
            reviewRequestedAt: wf.reviewRequestedAt,
          }
        : null,
      checklist,
    };
  },
});

/** Desk home: drafts + review queue + scheduled for the current user. */
export const listDesk = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserIdForStudio(ctx);
    if (!userId)
      return { drafts: [], reviewQueue: [], scheduled: [], ideas: [] };
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as never))
      .unique();
    const rank = profile ? ROLE_RANK[profile.role] ?? 0 : 0;

    const articles = await ctx.db.query("articles").collect();
    const mine: typeof articles = [];
    const review: typeof articles = [];
    const scheduled: typeof articles = [];

    for (const a of articles) {
      const author = a.primaryAuthorId
        ? await ctx.db.get(a.primaryAuthorId)
        : null;
      const isOwner = author?.userId === userId;
      if (a.status === "draft" || a.status === "needs_changes") {
        if (rank >= ROLE_RANK.editor || isOwner) mine.push(a);
      } else if (a.status === "in_review" && rank >= ROLE_RANK.editor) {
        review.push(a);
      } else if (a.status === "scheduled" && rank >= ROLE_RANK.editor) {
        scheduled.push(a);
      }
    }

    const card = (a: (typeof articles)[number]) => ({
      _id: a._id,
      slug: a.slug,
      title: a.title,
      status: a.status,
      updatedAt: a.updatedAt,
      wordCount: a.wordCount,
    });

    return {
      drafts: mine
        .sort((x, y) => y.updatedAt - x.updatedAt)
        .slice(0, 10)
        .map(card),
      reviewQueue: review
        .sort((x, y) => y.updatedAt - x.updatedAt)
        .slice(0, 10)
        .map(card),
      scheduled: scheduled
        .sort((x, y) => y.updatedAt - x.updatedAt)
        .slice(0, 10)
        .map(card),
      ideas: [],
    };
  },
});

async function getAuthUserIdForStudio(
  ctx: Parameters<typeof getAuthUserId>[0],
): Promise<string | null> {
  return getAuthUserId(ctx);
}

// ---------- queries ----------

/** Homepage feed (§06): articles with corner + author for cards. */
export const listHomeFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_status_published", (q) => q.eq("status", "published"))
      .order("desc")
      .take(args.limit ?? 12);

    return await Promise.all(
      articles.map(async (a) => {
        const cornerJoin = await ctx.db
          .query("articleCorners")
          .withIndex("by_article", (q) => q.eq("articleId", a._id))
          .first();
        const corner = cornerJoin
          ? await ctx.db.get(cornerJoin.cornerId)
          : null;
        const author = a.primaryAuthorId
          ? await ctx.db.get(a.primaryAuthorId)
          : null;
        return {
          _id: a._id,
          slug: a.slug,
          title: a.title,
          dek: a.dek,
          readingTimeSeconds: a.readingTimeSeconds,
          publishedAt: a.publishedAt,
          contentType: a.contentType,
          cornerName: corner?.name ?? null,
          cornerSlug: corner?.slug ?? null,
          author: author
            ? { displayName: author.displayName, slug: author.slug }
            : null,
        };
      }),
    );
  },
});

/** One featured article per corner for corner discovery (§06.4). */
export const listCornerFeatures = query({
  args: {},
  handler: async (ctx) => {
    const corners = await ctx.db
      .query("corners")
      .withIndex("by_active_position", (q) => q.eq("isActive", true))
      .order("asc")
      .collect();

    const result: Record<
      string,
      { title: string; slug: string } | undefined
    > = {};
    for (const corner of corners) {
      const join = await ctx.db
        .query("articleCorners")
        .withIndex("by_primary", (q) =>
          q.eq("cornerId", corner._id).eq("isPrimary", true),
        )
        .first();
      if (join) {
        const article = await ctx.db.get(join.articleId);
        if (article && article.status === "published") {
          result[corner.slug] = { title: article.title, slug: article.slug };
        }
      }
    }
    return result;
  },
});

/** Card data for search results (§8.6). */
export const getCardById = query({
  args: { id: v.id("articles") },
  handler: async (ctx, args) => {
    const a = await ctx.db.get(args.id);
    if (!a || a.status !== "published") return null;
    const cornerJoin = await ctx.db
      .query("articleCorners")
      .withIndex("by_article", (q) => q.eq("articleId", a._id))
      .first();
    const corner = cornerJoin ? await ctx.db.get(cornerJoin.cornerId) : null;
    return {
      _id: a._id,
      slug: a.slug,
      title: a.title,
      dek: a.dek ?? null,
      readingTimeSeconds: a.readingTimeSeconds,
      publishedAt: a.publishedAt ?? null,
      cornerName: corner?.name ?? null,
    };
  },
});

export const listPublished = query({
  args: {
    cornerSlug: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cornerSlug = args.cornerSlug;
    const corner = cornerSlug
      ? await ctx.db.query("corners").withIndex("by_slug", (q) => q.eq("slug", cornerSlug)).unique()
      : null;

    if (cornerSlug && !corner) return [];

    let articleIds: string[] | null = null;
    if (corner) {
      const joins = await ctx.db
        .query("articleCorners")
        .withIndex("by_corner", (q) => q.eq("cornerId", corner._id))
        .collect();
      articleIds = joins.map((j) => j.articleId);
    }

    const articles = await ctx.db
      .query("articles")
      .withIndex("by_status_published", (q) =>
        q.eq("status", "published")
      )
      .order("desc")
      .take(args.limit ?? 30);

    return articles
      .filter((a) => (articleIds === null ? true : articleIds.includes(a._id)))
      .map((a) => ({
        _id: a._id,
        slug: a.slug,
        title: a.title,
        dek: a.dek,
        readingTimeSeconds: a.readingTimeSeconds,
        publishedAt: a.publishedAt,
        contentType: a.contentType,
      }));
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const article = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!article) return null;

    // Publication gate (§27): unpublished content is invisible to the public.
    // Studio code uses internal queries with session checks instead.
    if (article.status !== "published") return null;

    const corners = await ctx.db
      .query("articleCorners")
      .withIndex("by_article", (q) => q.eq("articleId", article._id))
      .collect();

    const cornerDocs = await Promise.all(
      corners.map((c) => ctx.db.get(c.cornerId)),
    );

    const author = article.primaryAuthorId
      ? await ctx.db.get(article.primaryAuthorId)
      : null;

    return {
      ...article,
      corners: cornerDocs.filter(Boolean),
      author: author
        ? { slug: author.slug, displayName: author.displayName, isGhost: author.isGhost }
        : null,
    };
  },
});

// ---------- mutations ----------

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.optional(v.string()),
    primaryAuthorId: v.optional(v.id("authors")),
  },
  handler: async (ctx, args) => {
    const session = await requireRole(ctx, "author");

    const slug =
      args.slug ??
      args.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 80);

    const existing = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing) throw new Error(`Slug '${slug}' already exists.`);

    const now = Date.now();
    const articleId = await ctx.db.insert("articles", {
      slug,
      title: args.title,
      dek: undefined,
      contentJson: { type: "doc", content: [] },
      contentText: "",
      status: "draft",
      primaryAuthorId: args.primaryAuthorId,
      readingTimeSeconds: 0,
      wordCount: 0,
      publishedAt: undefined,
      createdAt: now,
      updatedAt: now,
      humanAuthorshipAttested: false,
      coverAssetId: undefined,
      canonicalUrl: undefined,
      seoDescription: undefined,
      seoTitle: undefined,
      correctionNote: undefined,
      mood: undefined,
      intent: undefined,
      contentType: undefined,
      readingDepth: undefined,
    });

    await ctx.db.insert("articleWorkflow", {
      articleId,
      state: "draft",
      assignedEditorId: undefined,
      reviewRequestedAt: undefined,
      approvedAt: undefined,
      scheduledFor: undefined,
      updatedAt: now,
    });

    await audit(ctx, session, "article.create", "articles", articleId, null, { slug, title: args.title });
    return articleId;
  },
});

export const saveDraft = mutation({
  args: {
    articleId: v.id("articles"),
    title: v.optional(v.string()),
    dek: v.optional(v.string()),
    contentJson: v.any(),
    contentText: v.optional(v.string()),
    coverAssetId: v.optional(v.id("mediaAssets")),
    contentType: v.optional(v.union(
      v.literal("essay"), v.literal("story"), v.literal("guide"),
      v.literal("opinion"), v.literal("interview"), v.literal("lesson"),
      v.literal("vocabulary"), v.literal("reflection"), v.literal("explainer"),
    )),
    readingDepth: v.optional(v.union(
      v.literal("quick"), v.literal("standard"), v.literal("deep"),
    )),
    mood: v.optional(v.string()),
    intent: v.optional(v.string()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    humanAuthorshipAttested: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx);
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Article not found.");

    const author = article.primaryAuthorId
      ? await ctx.db.get(article.primaryAuthorId)
      : null;

    if (!canEditArticle(session, article, author?.userId ?? null)) {
      throw new Error("You do not have permission to edit this article.");
    }

    // Autosave state discipline (§13.4): only drafts/needs_changes accept edits.
    if (!["draft", "needs_changes", "idea"].includes(article.status)) {
      throw new Error(`Cannot edit an article in '${article.status}' state.`);
    }

    const wordCount = (args.contentText ?? article.contentText)
      .split(/\s+/)
      .filter(Boolean).length;
    const readingTimeSeconds = Math.round((wordCount / 220) * 60);

    const before = { title: article.title, updatedAt: article.updatedAt };
    await ctx.db.patch(args.articleId, {
      title: args.title ?? article.title,
      dek: args.dek ?? article.dek,
      contentJson: args.contentJson,
      contentText: args.contentText ?? article.contentText,
      coverAssetId: args.coverAssetId ?? article.coverAssetId,
      contentType: args.contentType ?? article.contentType,
      readingDepth: args.readingDepth ?? article.readingDepth,
      mood: args.mood ?? article.mood,
      intent: args.intent ?? article.intent,
      seoTitle: args.seoTitle ?? article.seoTitle,
      seoDescription: args.seoDescription ?? article.seoDescription,
      humanAuthorshipAttested: args.humanAuthorshipAttested ?? article.humanAuthorshipAttested,
      wordCount,
      readingTimeSeconds,
      updatedAt: Date.now(),
    });
    await audit(ctx, session, "article.saveDraft", "articles", args.articleId, before, { updatedAt: Date.now() });
  },
});

export const createRevisionSnapshot = mutation({
  args: { articleId: v.id("articles"), reason: v.union(
    v.literal("autosave"), v.literal("snapshot"), v.literal("explicit"), v.literal("publish"),
  )},
  handler: async (ctx, args) => {
    const session = await requireSession(ctx);
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Article not found.");
    const author = article.primaryAuthorId ? await ctx.db.get(article.primaryAuthorId) : null;
    if (!canEditArticle(session, article, author?.userId ?? null)) {
      throw new Error("Not permitted.");
    }

    const last = await ctx.db
      .query("articleRevisions")
      .withIndex("by_article_number", (q) => q.eq("articleId", args.articleId))
      .order("desc")
      .first();

    await ctx.db.insert("articleRevisions", {
      articleId: args.articleId,
      revisionNumber: (last?.revisionNumber ?? 0) + 1,
      contentJson: article.contentJson,
      contentText: article.contentText,
      metadata: {
        title: article.title,
        dek: article.dek,
        seoTitle: article.seoTitle,
        seoDescription: article.seoDescription,
      },
      createdBy: session.userId as never,
      reason: args.reason,
      createdAt: Date.now(),
    });
  },
});

// ---------- workflow transitions (§13.2) ----------

async function transition(
  ctx: MutationCtx,
  args: { articleId: Id<"articles">; to: string },
  minimumRole: keyof typeof ROLE_RANK,
  action: string,
) {
  const session = await requireRole(ctx, minimumRole);
  const article = await ctx.db.get(args.articleId);
  if (!article) throw new Error("Article not found.");

  assertTransition(article.status, args.to);

  const patch: Record<string, unknown> = {
    status: args.to,
    updatedAt: Date.now(),
  };
  if (args.to === "published") patch.publishedAt = Date.now();

  await ctx.db.patch(args.articleId, patch);
  const wf = await ctx.db
    .query("articleWorkflow")
    .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
    .unique();
  if (wf) {
    const wfPatch: Record<string, unknown> = { state: args.to, updatedAt: Date.now() };
    if (args.to === "in_review") wfPatch.reviewRequestedAt = Date.now();
    if (args.to === "approved") wfPatch.approvedAt = Date.now();
    if (args.to === "scheduled") wfPatch.scheduledFor = article.publishedAt;
    await ctx.db.patch(wf._id, wfPatch);
  }

  // §27: publish snapshot + reindex trigger
  if (args.to === "published") {
    await ctx.scheduler.runAfter(0, internal.articles.onPublished, {
      articleId: args.articleId,
    });
  }

  await audit(ctx, session, action, "articles", args.articleId, { status: article.status }, { status: args.to });
}

export const submitForReview = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx);
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Article not found.");
    const author = article.primaryAuthorId ? await ctx.db.get(article.primaryAuthorId) : null;
    if (!canEditArticle(session, article, author?.userId ?? null)) {
      throw new Error("Not permitted.");
    }
    await transition(ctx, { articleId: args.articleId, to: "in_review" }, "author", "article.submitForReview");
  },
});

export const requestChanges = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) =>
    transition(ctx, { articleId: args.articleId, to: "needs_changes" }, "editor", "article.requestChanges"),
});

export const approve = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) =>
    transition(ctx, { articleId: args.articleId, to: "approved" }, "senior_editor", "article.approve"),
});

export const schedule = mutation({
  args: { articleId: v.id("articles"), scheduledFor: v.number() },
  handler: async (ctx, args) => {
    const session = await requireRole(ctx, "editor");
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Article not found.");
    assertTransition(article.status, "scheduled");
    await ctx.db.patch(args.articleId, { status: "scheduled", publishedAt: args.scheduledFor, updatedAt: Date.now() });
    const wf = await ctx.db
      .query("articleWorkflow")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .unique();
    if (wf) {
      await ctx.db.patch(wf._id, { state: "scheduled", scheduledFor: args.scheduledFor, updatedAt: Date.now() });
    }
    await audit(ctx, session, "article.schedule", "articles", args.articleId, null, { scheduledFor: args.scheduledFor });
  },
});

export const publish = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) =>
    transition(ctx, { articleId: args.articleId, to: "published" }, "senior_editor", "article.publish"),
});

export const archive = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) =>
    transition(ctx, { articleId: args.articleId, to: "archived" }, "editor", "article.archive"),
});

// ---------- internal: post-publish pipeline (§27) ----------

export const onPublished = internalMutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    // Create the publish snapshot
    const article = await ctx.db.get(args.articleId);
    if (!article) return;
    const last = await ctx.db
      .query("articleRevisions")
      .withIndex("by_article_number", (q) => q.eq("articleId", args.articleId))
      .order("desc")
      .first();
    await ctx.db.insert("articleRevisions", {
      articleId: args.articleId,
      revisionNumber: (last?.revisionNumber ?? 0) + 1,
      contentJson: article.contentJson,
      contentText: article.contentText,
      metadata: { title: article.title, dek: article.dek },
      createdBy: undefined,
      reason: "publish",
      createdAt: Date.now(),
    });
    // Embedding refresh is queued by the search system (convex/search.ts)
    await ctx.scheduler.runAfter(0, internal.search.queueEmbedding, {
      articleId: args.articleId,
    });
  },
});
