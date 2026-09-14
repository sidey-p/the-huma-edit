import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

/** §29.3 dynamic sitemap: articles, corners, authors, paths, topics. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/explore",
    "/corners",
    "/paths",
    "/topics",
    "/archive",
    "/about",
    "/authors",
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
    const supabase = await createClient();
    const [articles, corners, authors, paths, topics] = await Promise.all([
      supabase
        .from("articles")
        .select("slug, published_at, updated_at")
        .eq("status", "published")
        .limit(500),
      supabase.from("corners").select("slug").eq("is_active", true),
      supabase.from("authors").select("slug"),
      supabase.from("reading_paths").select("slug").eq("status", "published"),
      supabase.from("topics").select("slug"),
    ]);

    const articlePages: MetadataRoute.Sitemap = (articles.data ?? []).map(
      (a: { slug: string; updated_at?: string; published_at?: string }) => ({
        url: `${base}/articles/${a.slug}`,
        lastModified: new Date(a.updated_at ?? a.published_at ?? Date.now()),
        changeFrequency: "monthly",
        priority: 0.8,
      }),
    );

    const cornerPages: MetadataRoute.Sitemap = (corners.data ?? []).map(
      (c: { slug: string }) => ({
        url: `${base}/corners/${c.slug}`,
        changeFrequency: "weekly",
        priority: 0.6,
      }),
    );

    const authorPages: MetadataRoute.Sitemap = (authors.data ?? []).map(
      (a: { slug: string }) => ({
        url: `${base}/authors/${a.slug}`,
        changeFrequency: "monthly",
        priority: 0.4,
      }),
    );

    const pathPages: MetadataRoute.Sitemap = (paths.data ?? []).map(
      (p: { slug: string }) => ({
        url: `${base}/paths/${p.slug}`,
        changeFrequency: "monthly",
        priority: 0.6,
      }),
    );

    const topicPages: MetadataRoute.Sitemap = (topics.data ?? []).map(
      (t: { slug: string }) => ({
        url: `${base}/topics/${t.slug}`,
        changeFrequency: "weekly",
        priority: 0.5,
      }),
    );

    return [
      ...staticPages,
      ...articlePages,
      ...cornerPages,
      ...authorPages,
      ...pathPages,
      ...topicPages,
    ];
  } catch {
    // Supabase unreachable at build time - ship static pages only
    return staticPages;
  }
}
