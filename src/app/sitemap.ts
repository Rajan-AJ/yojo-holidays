import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { findSitemapEntries } from "@/server/repositories/sitemap";
import { getVisaParams } from "@/server/queries";
import { routes } from "@/lib/routes";
import { siteConfig } from "@/config/site";

/** /sitemap.xml - generated from the database (refreshed hourly and on publish). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  cacheTag("packages", "destinations", "visa", "blog", "categories");

  const [entries, visa] = await Promise.all([findSitemapEntries(), getVisaParams()]);
  const url = (path: string) => `${siteConfig.url}${path}`;
  const staticPages = [
    routes.home(),
    routes.tours(),
    routes.scope("INTERNATIONAL"),
    routes.scope("DOMESTIC"),
    routes.destinations(),
    routes.visa(),
    routes.journal(),
    routes.faq(),
    routes.contact(),
    routes.planTrip(),
  ];
  return [
    ...staticPages.map((p) => ({ url: url(p) })),
    ...entries.map((e) => ({ url: url(e.path), lastModified: e.lastModified })),
    ...visa.types.map((t) => ({ url: url(routes.visaType(t.country, t.visaType)) })),
  ];
}
