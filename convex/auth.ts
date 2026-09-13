import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

/**
 * THE HUMAN EDIT — Auth (§37)
 * Email + password. Reader accounts default to "reader" role;
 * editorial roles are granted by admins in Studio.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return { email: params.email as string };
      },
    }),
  ],
  callbacks: {
    // After signup: create profile row (§23.1) + default preferences (§7.5)
    // First user on a fresh deployment becomes owner (§31).
    async afterUserCreatedOrUpdated(ctx, { userId }) {
      // Callback ctx is AnyDataModel-typed; cast to our data model for table typing
      const db = ctx.db as unknown as import("convex/server").GenericMutationCtx<
        import("./_generated/dataModel").DataModel
      >["db"];
      const existing = await db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();
      if (existing) return;
      const user = await db.get(userId);
      const profileCount = await db.query("profiles").collect();
      const isFirstUser = profileCount.length === 0;
      const now = Date.now();
      await db.insert("profiles", {
        userId,
        username: undefined,
        fullName: user?.name ?? undefined,
        avatarUrl: user?.image ?? undefined,
        bio: undefined,
        role: isFirstUser ? "owner" : "reader",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      await db.insert("readerPreferences", {
        userId,
        readingTheme: "light",
        fontSize: "m",
        lineHeight: "m",
        readingFace: "serif",
        updatedAt: now,
      });
    },
  },
});
