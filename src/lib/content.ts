import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

/**
 * Server-side data access (§25 server-first).
 * Article/corner/topic/author pages render server-side via fetchQuery.
 */

export type ArticleDetail = NonNullable<
  Awaited<ReturnType<typeof fetchArticleBySlug>>
>;

export async function fetchArticleBySlug(slug: string) {
  return fetchQuery(api.articles.getBySlug, { slug });
}

export async function fetchPublishedArticles(limit = 30) {
  return fetchQuery(api.articles.listPublished, { limit });
}

export async function fetchCorners() {
  return fetchQuery(api.taxonomy.listCorners, {});
}
