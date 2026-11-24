import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// Sitemap: src/app/sitemap.ts (database-driven). Until the live domain sets
// NEXT_PUBLIC_ALLOW_INDEXING=true, every deployment blocks crawlers.
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_ALLOW_INDEXING !== "true") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
