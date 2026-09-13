import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * THE HUMAN EDIT - Reading paths (section 9) + recommendations (section 17)
 */

export const listPublishedPaths = query({
  args: {},
  handler: async (ctx) => {
    const paths = await ctx.db
      .query("readingPaths")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    const out = [];
    for (const p of paths) {
      const steps = await ctx.db
        .query("readingPathSteps")
        .withIndex("by_path", (q) => q.eq("pathId", p._id))
        .order("asc")
        .collect();
      const articles = await Promise.all(
        steps.map(async (s) => {
          const a = await ctx.db.get(s.articleId);
          return a && a.status === "published"
            ? {
                _id: a._id,
                slug: a.slug,
                title: s.stepTitleOverride ?? a.title,
                intro: s.stepIntro ?? null,
                readingTimeSeconds: a.readingTimeSeconds,
              }
            : null;
        }),
      );
      const valid = articles.filter((a): a is NonNullable<typeof a> => !!a);
      if (valid.length === 0) continue;
      const totalSeconds = valid.reduce(
        (acc, a) => acc + a.readingTimeSeconds,
        0,
      );
      out.push({
        _id: p._id,
        slug: p.slug,
        title: p.title,
        description: p.description ?? null,
        totalSteps: valid.length,
        totalMinutes: Math.round(totalSeconds / 60),
        steps: valid,
      });
    }
    return out;
  },
});

export const getPathBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const p = await ctx.db
      .query("readingPaths")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!p || p.status !== "published") return null;

    const steps = await ctx.db
      .query("readingPathSteps")
      .withIndex("by_path", (q) => q.eq("pathId", p._id))
      .order("asc")
      .collect();

    const articles = await Promise.all(
      steps.map(async (s) => {
        const a = await ctx.db.get(s.articleId);
        return a && a.status === "published"
          ? {
              _id: a._id,
              slug: a.slug,
              title: s.stepTitleOverride ?? a.title,
              dek: a.dek ?? null,
              intro: s.stepIntro ?? null,
              readingTimeSeconds: a.readingTimeSeconds,
            }
          : null;
      }),
    );
    const valid = articles.filter((a): a is NonNullable<typeof a> => !!a);
    if (valid.length === 0) return null;
    const totalSeconds = valid.reduce((acc, a) => acc + a.readingTimeSeconds, 0);
    return {
      _id: p._id,
      slug: p.slug,
      title: p.title,
      description: p.description ?? null,
      totalSteps: valid.length,
      totalMinutes: Math.round(totalSeconds / 60),
      steps: valid,
    };
  },
});

/**
 * Recommendations (17): editorial intent + reader relevance.
 * 70% relevant / 20% adjacent / 10% editorial surprise (17.2).
 * V1: same-corner + same-topic overlap with explicit relationships first.
 */
export const listRelated = query({
  args: { articleId: v.id("articles"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) return [];

    // 1. Explicit editorial relationships win (14.3)
    const rels = await ctx.db
      .query("articleRelationships")
      .withIndex("by_from", (q) => q.eq("fromArticleId", args.articleId))
      .collect();
    const explicit = await Promise.all(
      rels.map(async (r) => {
        const a = await ctx.db.get(r.toArticleId);
        return a && a.status === "published"
          ? { article: a, reason: r.relationship, source: "explicit" as const }
          : null;
      }),
    );

    // 2. Same corner + shared topics
    const cornerJoins = await ctx.db
      .query("articleCorners")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .collect();
    const topicJoins = await ctx.db
      .query("articleTopics")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .collect();

    const candidates = new Map<
      string,
      { slug: string; title: string; dek: string | null; score: number }
    >();

    for (const cj of cornerJoins) {
      const sameCorner = await ctx.db
        .query("articleCorners")
        .withIndex("by_corner", (q) => q.eq("cornerId", cj.cornerId))
        .collect();
      for (const other of sameCorner) {
        if (other.articleId === args.articleId) continue;
        const a = await ctx.db.get(other.articleId);
        if (!a || a.status !== "published") continue;
        const cur = candidates.get(a._id);
        candidates.set(a._id, {
          slug: a.slug,
          title: a.title,
          dek: a.dek ?? null,
          score: (cur?.score ?? 0) + 1,
        });
      }
    }

    for (const tj of topicJoins) {
      const sameTopic = await ctx.db
        .query("articleTopics")
        .withIndex("by_topic", (q) => q.eq("topicId", tj.topicId))
        .collect();
      for (const other of sameTopic) {
        if (other.articleId === args.articleId) continue;
        const a = await ctx.db.get(other.articleId);
        if (!a || a.status !== "published") continue;
        const cur = candidates.get(a._id);
        candidates.set(a._id, {
          slug: a.slug,
          title: a.title,
          dek: a.dek ?? null,
          score: (cur?.score ?? 0) + 2,
        });
      }
    }

    const limit = args.limit ?? 3;
    const out: Array<{
      _id: string;
      slug: string;
      title: string;
      dek: string | null;
      reason: string;
    }> = [];

    for (const e of explicit) {
      if (e && e.article && out.length < limit && "slug" in e.article) {
        out.push({
          _id: e.article._id,
          slug: (e.article as { slug: string }).slug,
          title: (e.article as { title: string }).title,
          dek: (e.article as { dek?: string }).dek ?? null,
          reason: e.reason === "opposing_viewpoint"
            ? "Another perspective"
            : "Editor's connection",
        });
      }
    }

    for (const [, c] of [...candidates.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, limit)) {
      if (out.length >= limit) break;
      if (out.some((o) => o.slug === c.slug)) continue;
      out.push({
        _id: [...candidates.entries()].find(([, v]) => v.slug === c.slug)?.[0] ?? c.slug,
        slug: c.slug,
        title: c.title,
        dek: c.dek,
        reason: "From the same corner",
      });
    }

    return out;
  },
});
