import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * THE HUMAN EDIT - Author queries (§11)
 */

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("authors")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

/** §11.1 published works with corner metadata for cards. */
export const listPublishedWorks = query({
  args: { authorId: v.id("authors") },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) =>
        q.eq("primaryAuthorId", args.authorId).eq("status", "published"),
      )
      .order("desc")
      .collect();

    return await Promise.all(
      articles.map(async (a) => {
        const cornerJoin = await ctx.db
          .query("articleCorners")
          .withIndex("by_article", (q) => q.eq("articleId", a._id))
          .first();
        const corner = cornerJoin
          ? await ctx.db.get(cornerJoin.cornerId)
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
          author: null,
        };
      }),
    );
  },
});

/** All authors with published work (authors index page). */
export const listAuthors = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("authors").withIndex("by_slug").collect();
  },
});
