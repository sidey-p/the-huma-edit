import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireSession } from "./lib/permissions";

/**
 * THE HUMAN EDIT - Reader preferences (7.5)
 * Curated presets only - no arbitrary font chaos.
 */

export const getMyPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return (
      (
        await ctx.db
          .query("readerPreferences")
          .withIndex("by_user", (q) => q.eq("userId", userId as never))
          .unique()
      ) ?? null
    );
  },
});

export const updatePreferences = mutation({
  args: {
    readingTheme: v.optional(
      v.union(v.literal("light"), v.literal("dark"), v.literal("warm")),
    ),
    fontSize: v.optional(
      v.union(v.literal("s"), v.literal("m"), v.literal("l"), v.literal("xl")),
    ),
    lineHeight: v.optional(
      v.union(v.literal("compact"), v.literal("m"), v.literal("relaxed")),
    ),
    readingFace: v.optional(
      v.union(v.literal("serif"), v.literal("sans")),
    ),
  },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx);
    const existing = await ctx.db
      .query("readerPreferences")
      .withIndex("by_user", (q) => q.eq("userId", session.userId as never))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("readerPreferences", {
        userId: session.userId as never,
        readingTheme: args.readingTheme ?? "light",
        fontSize: args.fontSize ?? "m",
        lineHeight: args.lineHeight ?? "m",
        readingFace: args.readingFace ?? "serif",
        updatedAt: Date.now(),
      });
    }
  },
});
