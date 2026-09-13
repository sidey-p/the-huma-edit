import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * THE HUMAN EDIT - Taxonomy queries (section 4.1, 5)
 * Corners, topics, tags - public read paths.
 */

export const listCorners = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("corners")
      .withIndex("by_active_position", (q) => q.eq("isActive", true))
      .order("asc")
      .collect();
  },
});

export const listTopics = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("topics").withIndex("by_slug").collect();
  },
});

export const getCornerBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("corners")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

/** Topics attached to one article (article detail page chips). */
export const listTopicsForArticle = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const joins = await ctx.db
      .query("articleTopics")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .collect();
    const topics = await Promise.all(
      joins.map((j) => ctx.db.get(j.topicId)),
    );
    return topics
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .map((t) => ({ _id: t._id, slug: t.slug, name: t.name }));
  },
});
