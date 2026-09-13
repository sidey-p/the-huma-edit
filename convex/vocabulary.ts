import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireSession } from "./lib/permissions";

/**
 * THE HUMAN EDIT - English Corner vocabulary (section 18)
 */

export const listVocabulary = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("vocabularyWords").collect();
  },
});

export const searchVocabulary = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    const q = args.q.trim().toLowerCase();
    if (!q) return [];
    const all = await ctx.db.query("vocabularyWords").collect();
    return all.filter(
      (w) =>
        w.word.toLowerCase().includes(q) ||
        w.plainMeaning.toLowerCase().includes(q),
    );
  },
});

/** §18.3 save a word to the reader's personal vocabulary list. */
export const saveWord = mutation({
  args: { wordId: v.id("vocabularyWords"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx);
    const existing = await ctx.db
      .query("userVocabulary")
      .withIndex("by_user_word", (q) =>
        q.eq("userId", session.userId as never).eq("wordId", args.wordId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...(args.note !== undefined ? { personalNote: args.note } : {}),
      });
      return existing._id;
    }
    return await ctx.db.insert("userVocabulary", {
      userId: session.userId as never,
      wordId: args.wordId,
      ...(args.note !== undefined ? { personalNote: args.note } : {}),
      discoveredAt: Date.now(),
    });
  },
});

/** Remove a saved word. */
export const removeWord = mutation({
  args: { wordId: v.id("vocabularyWords") },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx);
    const existing = await ctx.db
      .query("userVocabulary")
      .withIndex("by_user_word", (q) =>
        q.eq("userId", session.userId as never).eq("wordId", args.wordId),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

/** All words saved by the current reader, newest first. */
export const listMyWords = query({
  args: {},
  handler: async (ctx) => {
    const session = await requireSession(ctx);
    const saved = await ctx.db
      .query("userVocabulary")
      .withIndex("by_user", (q) => q.eq("userId", session.userId as never))
      .collect();
    const sorted = [...saved].sort((a, b) => b.discoveredAt - a.discoveredAt);
    return await Promise.all(
      sorted.map(async (s) => {
        const word = await ctx.db.get(s.wordId);
        return {
          _id: s._id,
          savedAt: s.discoveredAt,
          note: s.personalNote ?? null,
          word: word
            ? {
                _id: word._id,
                word: word.word,
                pronunciation: word.pronunciation ?? null,
                partOfSpeech: word.partOfSpeech ?? null,
                plainMeaning: word.plainMeaning,
                usageExample: word.usageExample ?? null,
              }
            : null,
        };
      }),
    );
  },
});

/** One word per day, deterministic by date — everyone sees the same word. */
export const getWordOfTheDay = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("vocabularyWords").collect();
    if (all.length === 0) return null;
    const day = Math.floor(Date.now() / 86_400_000);
    return all[day % all.length];
  },
});

/** Words from a given article (§18.2 — "words to notice" in context). */
export const listByArticle = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vocabularyWords")
      .filter((q) => q.eq(q.field("sourceArticleId"), args.articleId))
      .collect();
  },
});
