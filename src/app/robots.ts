import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// Full sitemap generation arrives in Phase 12. Until the live domain sets
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
