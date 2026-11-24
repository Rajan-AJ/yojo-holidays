import "server-only";
import { query } from "@/lib/db";
import { routes } from "@/lib/routes";
import { live } from "./shared";

/**
 * Every indexable public URL with its last-modified date. Content marked
 * noindex in its SEO settings is left out. One query, any number of rows.
 */
export async function findSitemapEntries() {
  const notNoindex = (alias: string) =>
    `not exists (select 1 from public.seo_meta s where s.id = ${alias}.seo_meta_id and s.noindex)`;
  const rows = await query<{ kind: string; slug: string; parent: string | null; updated: Date }>(
    `select 'package' as kind, p.slug, null as parent, p.updated_at as updated
       from public.packages p join public.destinations d on d.id = p.primary_destination_id
      where ${live("p")} and ${live("d")} and ${notNoindex("p")}
     union all
     select 'destination', d.slug, null, d.updated_at from public.destinations d where ${live("d")} and ${notNoindex("d")}
     union all
     select 'category', c.slug, null, c.updated_at from public.package_categories c
      where ${live("c")} and ${notNoindex("c")}
        and exists (select 1 from public.package_category_links l join public.packages p on p.id = l.package_id
                     where l.category_id = c.id and ${live("p")})
     union all
     select 'visa', g.slug, null, g.updated_at from public.visa_guides g where ${live("g")} and ${notNoindex("g")}
     union all
     select 'post', b.slug, null, coalesce(b.content_updated_at, b.updated_at) from public.blog_posts b
      where ${live("b")} and ${notNoindex("b")}
     union all
     select 'blog-category', c.slug, null, c.updated_at from public.blog_categories c where ${live("c")} and ${notNoindex("c")}`,
  );
  const path = (r: (typeof rows)[number]) => {
    switch (r.kind) {
      case "package":
        return routes.tour(r.slug);
      case "destination":
        return routes.destination(r.slug);
      case "category":
        return routes.tourCategory(r.slug);
      case "visa":
        return routes.visaCountry(r.slug);
      case "post":
        return routes.article(r.slug);
      default:
        return routes.blogCategory(r.slug);
    }
  };
  return rows.map((r) => ({ path: path(r), lastModified: r.updated }));
}
