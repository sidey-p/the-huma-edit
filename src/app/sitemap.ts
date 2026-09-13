import type { MetadataRoute } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

/** §29.3 dynamic sitemap: articles, corners, authors, paths. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/explore",
    "/corners",
    "/paths",
    "/archive",
    "/about",
    "/editorial-policy",
    "/human-authorship",
    "/privacy",
    "/terms",
    "/accessibility",
    "/english/vocabulary",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  try {
    const [articles, corners, authors, paths] = await Promise.all([
      fetchQuery(api.articles.listPublished, { limit: 500 }),
      fetchQuery(api.taxonomy.listCorners, {}),
      fetchQuery(api.authors.listAuthors, {}),
      fetchQuery(api.paths.listPublishedPaths, {}),
    ]);

    const articlePages: MetadataRoute.Sitemap = articles.map((a) => ({
      url: `${base}/articles/${a.slug}`,
      lastModified: new Date(a.publishedAt ?? Date.now()),
      changeFrequency: "monthly",
      priority: 0.8,
    }));

    const cornerPages: MetadataRoute.Sitemap = corners.map((c) => ({
      url: `${base}/corners/${c.slug}`,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    const authorPages: MetadataRoute.Sitemap = authors.map((a) => ({
      url: `${base}/authors/${a.slug}`,
      changeFrequency: "monthly",
      priority: 0.4,
    }));

    const pathPages: MetadataRoute.Sitemap = paths.map((p) => ({
      url: `${base}/paths/${p.slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    return [
      ...staticPages,
      ...articlePages,
      ...cornerPages,
      ...authorPages,
      ...pathPages,
    ];
  } catch {
    // Convex unreachable at build time - ship static pages only
    return staticPages;
  }
}
