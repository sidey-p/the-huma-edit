import { ConvexError, v } from "convex/values";
import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, DataModel } from "../_generated/dataModel";

/**
 * THE HUMAN EDIT — Authorization (§24, §31)
 * Convex has no RLS; every function enforces permissions here.
 * Never trust client-provided roles or state (§26).
 */

export const ROLE_RANK: Record<string, number> = {
  reader: 0,
  author: 1,
  editor: 2,
  senior_editor: 3,
  admin: 4,
  owner: 5,
};

export interface Session {
  userId: string;
  profile: Doc<"profiles">;
  role: string;
}

/** Query-or-mutation ctx bound to our data model (read path). */
export type Ctx = GenericQueryCtx<DataModel>;
/** Mutation ctx bound to our data model (write path). */
export type MutationCtx = GenericMutationCtx<DataModel>;

/** Load the caller's profile + role, or null if signed out. */
export async function getSession(ctx: Ctx): Promise<Session | null> {
  const userId = await getAuthUserId(ctx as never);
  if (!userId) return null;
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (!profile || !profile.isActive) return null;
  return { userId, profile, role: profile.role };
}

/** Require a signed-in session or throw. */
export async function requireSession(ctx: Ctx): Promise<Session> {
  const session = await getSession(ctx);
  if (!session) throw new ConvexError({ code: "UNAUTHORIZED", message: "Sign in required." });
  return session;
}

/** Require a minimum editorial role (§31). */
export async function requireRole(
  ctx: Ctx,
  minimum: keyof typeof ROLE_RANK,
): Promise<Session> {
  const session = await requireSession(ctx);
  if ((ROLE_RANK[session.role] ?? 0) < ROLE_RANK[minimum]) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `Requires ${minimum} role or above.`,
    });
  }
  return session;
}

/** Can this session edit the given article (author of own draft, or editor+)? */
export function canEditArticle(
  session: Session,
  article: Pick<Doc<"articles">, "status">,
  articleAuthorUserId: string | null | undefined,
): boolean {
  const rank = ROLE_RANK[session.role] ?? 0;
  if (rank >= ROLE_RANK.editor) return true;
  if (rank === ROLE_RANK.author) {
    return (
      articleAuthorUserId === session.userId &&
      (article.status === "idea" || article.status === "draft" || article.status === "needs_changes")
    );
  }
  return false;
}

/** Legal editorial state transitions (§13.1). */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  idea: ["draft"],
  draft: ["in_review", "archived"],
  in_review: ["needs_changes", "approved"],
  needs_changes: ["draft", "in_review"],
  approved: ["scheduled", "published"],
  scheduled: ["published"],
  published: ["archived"],
  archived: [],
};

export function assertTransition(from: string, to: string): void {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new ConvexError({
      code: "BAD_TRANSITION",
      message: `Cannot move article from '${from}' to '${to}'.`,
    });
  }
}

/** Audit trail for privileged mutations (§23.9). */
export async function audit(
  ctx: MutationCtx,
  session: Session | null,
  action: string,
  entity: string,
  entityId: string | undefined,
  before: unknown,
  after: unknown,
): Promise<void> {
  await ctx.db.insert("auditLogs", {
    actorId: session ? (session.userId as never) : undefined,
    action,
    entity,
    entityId,
    before: before ?? undefined,
    after: after ?? undefined,
    createdAt: Date.now(),
  });
}

export const roleValidator = v.union(
  v.literal("reader"),
  v.literal("author"),
  v.literal("editor"),
  v.literal("senior_editor"),
  v.literal("admin"),
  v.literal("owner"),
);
