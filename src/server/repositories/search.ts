import "server-only";
import { query } from "@/lib/db";
import type { DestinationSummary, TourSummary } from "@/types/content";
import { routes } from "@/lib/routes";
import { priceBasisLabel } from "@/lib/labels";
import { live, mediaJson, opt, toImage, toScope, type MediaRow } from "./shared";

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 80;

/** Trim, collapse spaces and cap length. Returns null when too short to search. */
export function normaliseQuery(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const q = raw.replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX_LENGTH);
  return q.length >= SEARCH_MIN_LENGTH ? q : null;
}

/**
 * Site search over destinations and packages.
 *
 * Ranks with Postgres full-text search (search_vector GIN indexes: name and
 * summary) and falls back to substring matches on names, countries and the
 * places an itinerary visits ("Tokyo" finds a Japan tour that stops there).
 * Indexed, so it stays fast with thousands of rows.
 */
export async function searchContent(q: string, limit = 12) {
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

  const [destinationRows, packageRows] = await Promise.all([
    query<{
      id: string;
      name: string;
      slug: string;
      type: string;
      scope: string;
      short_description: string | null;
      is_sample: boolean;
      image: MediaRow;
      country_name: string;
      region_name: string | null;
    }>(
      `select d.id, d.name, d.slug, d.type, d.scope, d.short_description, d.is_sample,
              ${mediaJson("d.hero_media_id")} as image, c.name as country_name, r.name as region_name
         from public.destinations d
         join public.countries c on c.id = d.country_id
         left join public.regions r on r.id = c.region_id
        where ${live("d")}
          and (d.search_vector @@ websearch_to_tsquery('english', $1) or d.name ilike $2 or c.name ilike $2)
        order by ts_rank(d.search_vector, websearch_to_tsquery('english', $1)) desc, d.parent_id nulls first, d.name
        limit $3`,
      [q, like, limit],
    ),
    query<{
      id: string;
      name: string;
      slug: string;
      short_description: string | null;
      duration_days: number;
      duration_nights: number;
      starting_price: number | null;
      currency: string;
      is_sample: boolean;
      image: MediaRow;
      destination_name: string;
      price_basis: keyof typeof priceBasisLabel | null;
      categories: string[];
    }>(
      `select p.id, p.name, p.slug, p.short_description, p.duration_days, p.duration_nights, p.starting_price,
              p.currency, p.is_sample, ${mediaJson("p.hero_media_id")} as image, d.name as destination_name,
              (select pp.price_basis from public.package_prices pp
                where pp.package_id = p.id and pp.is_active and pp.adult_twin_sharing = p.starting_price limit 1) as price_basis,
              (select coalesce(array_agg(c.name order by c.sort_order), '{}')
                 from public.package_category_links l join public.package_categories c on c.id = l.category_id
                where l.package_id = p.id and ${live("c")}) as categories
         from public.packages p
         join public.destinations d on d.id = p.primary_destination_id
        where ${live("p")} and ${live("d")}
          and (p.search_vector @@ websearch_to_tsquery('english', $1)
               or p.name ilike $2
               or exists (select 1 from public.package_destinations pd
                            join public.destinations x on x.id = pd.destination_id
                            join public.countries xc on xc.id = x.country_id
                           where pd.package_id = p.id and (x.name ilike $2 or xc.name ilike $2))
               or exists (select 1 from public.itinerary_days it
                            join public.destinations od on od.id = it.overnight_destination_id
                           where it.package_id = p.id and od.name ilike $2))
        order by ts_rank(p.search_vector, websearch_to_tsquery('english', $1)) desc, p.is_featured desc, p.published_at desc
        limit $3`,
      [q, like, limit],
    ),
  ]);

  const destinations: DestinationSummary[] = destinationRows.flatMap((d) => {
    const image = toImage(d.image);
    if (!image) return [];
    return [
      {
        id: d.id,
        name: d.name,
        region: d.type === "country" ? (d.region_name ?? d.country_name) : d.country_name,
        tagline: opt(d.short_description),
        scope: toScope(d.scope),
        href: routes.destination(d.slug),
        image,
        isSample: d.is_sample,
      },
    ];
  });

  const tours: TourSummary[] = packageRows.flatMap((p) => {
    const image = toImage(p.image);
    if (!image) return [];
    return [
      {
        id: p.id,
        name: p.name,
        href: routes.tour(p.slug),
        destination: p.destination_name,
        durationDays: p.duration_days,
        durationNights: p.duration_nights,
        summary: opt(p.short_description),
        categories: p.categories,
        price: { amount: p.starting_price, currency: p.currency, note: p.price_basis ? priceBasisLabel[p.price_basis] : undefined },
        image,
        isSample: p.is_sample,
      },
    ];
  });

  return { destinations, tours };
}

/** Names offered as suggestions in the hero search box. */
export async function findSearchSuggestions(limit = 30) {
  const rows = await query<{ name: string }>(
    `select d.name from public.destinations d where ${live("d")} order by d.is_featured desc, d.name limit $1`,
    [limit],
  );
  return rows.map((r) => r.name);
}
