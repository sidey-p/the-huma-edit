import type { MetadataRoute } from "next";

/** §29.2: keep admin/search internals out of the index. */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/studio", "/library", "/settings", "/sign-in", "/search"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
