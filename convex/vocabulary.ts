import { v } from "convex/values";
import { query } from "./_generated/server";

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
