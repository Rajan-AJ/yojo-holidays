import "server-only";
import { query, queryOne } from "@/lib/db";
import type { CountryDetail, DestinationDetail, DestinationSummary, LinkRef, TourScope } from "@/types/content";
import { routes } from "@/lib/routes";
import { nonEmptyDoc, type RichTextDoc } from "@/lib/rich-text";
import {
  faqsJson,
  fromScope,
  galleryJson,
  live,
  mediaJson,
  opt,
  seoJson,
  toGallery,
  toImage,
  toScope,
  toSeo,
  type MediaRow,
} from "./shared";
import { toVisaSummary, visaSummaryJson, type VisaSummaryRow } from "./visa-summary";

// ---------------------------------------------------------------------------
// Summaries (cards)
// ---------------------------------------------------------------------------

/** Published tours that visit this destination or a place inside it. */
const tourCount = (idExpr: string) => `(
  select count(distinct pd.package_id)
    from public.package_destinations pd
    join public.packages p on p.id = pd.package_id
    join public.destinations dd on dd.id = pd.destination_id
    join public.destinations pdst on pdst.id = p.primary_destination_id
   where (dd.id = ${idExpr} or dd.parent_id = ${idExpr}) and ${live("p")} and ${live("pdst")})`;

const SUMMARY_COLUMNS = `
  d.id, d.name, d.slug, d.type, d.scope, d.short_description, d.is_sample,
  ${mediaJson("d.hero_media_id")} as image,
  c.name as country_name, r.name as region_name,
  ${tourCount("d.id")} as tour_count`;

const FROM_VISIBLE = `
  from public.destinations d
  join public.countries c on c.id = d.country_id
  left join public.regions r on r.id = c.region_id
  where ${live("d")}`;

const LIST_ORDER = "order by d.sort_order, d.name";

type SummaryRow = {
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
  tour_count: number;
};

/** A country card shows its region; a city or place shows its country. */
const regionLine = (row: Pick<SummaryRow, "type" | "country_name" | "region_name">) =>
  row.type === "country" ? (row.region_name ?? row.country_name) : row.country_name;

/** Cards need a photo: rows without one are skipped rather than rendered broken. */
function summaries(rows: SummaryRow[]): DestinationSummary[] {
  return rows.flatMap((row) => {
    const image = toImage(row.image);
    if (!image) return [];
    return [
      {
        id: row.id,
        name: row.name,
        region: regionLine(row),
        tagline: opt(row.short_description),
        scope: toScope(row.scope),
        href: routes.destination(row.slug),
        image,
        tourCount: row.tour_count,
        isSample: row.is_sample,
      },
    ];
  });
}

export async function findFeaturedDestinations(limit = 8) {
  const rows = await query<SummaryRow>(
    `select ${SUMMARY_COLUMNS} ${FROM_VISIBLE} and d.is_featured ${LIST_ORDER} limit $1`,
    [limit],
  );
  return summaries(rows);
}

/** Top-level destinations (countries, Indian states, standalone cities) for a scope or for all. */
export async function findTopLevelDestinations(scope?: TourScope) {
  const params: unknown[] = [];
  let where = " and (d.parent_id is null or not exists (select 1 from public.destinations x where x.id = d.parent_id and x.deleted_at is null))";
  if (scope) {
    params.push(fromScope(scope));
    where += ` and d.scope = $1`;
  }
  const rows = await query<SummaryRow>(`select ${SUMMARY_COLUMNS} ${FROM_VISIBLE} ${where} ${LIST_ORDER}`, params);
  return summaries(rows);
}

/** Every published destination in a country (visa pages: "related destinations"). */
export async function findDestinationsByCountry(countrySlug: string) {
  const rows = await query<SummaryRow>(
    `select ${SUMMARY_COLUMNS} ${FROM_VISIBLE} and c.slug = $1 order by d.parent_id nulls first, d.sort_order, d.name`,
    [countrySlug],
  );
  return summaries(rows);
}

export async function findDestinationSlugs() {
  const rows = await query<{ slug: string }>(`select d.slug ${FROM_VISIBLE}`);
  return rows.map((r) => r.slug);
}

export async function destinationExists(slug: string) {
  return Boolean(await queryOne(`select 1 ${FROM_VISIBLE} and d.slug = $1`, [slug]));
}

// ---------------------------------------------------------------------------
// Detail page
// ---------------------------------------------------------------------------

type DetailRow = SummaryRow & {
  description: RichTextDoc | null;
  best_time_to_visit: string | null;
  best_months: number[];
  ideal_duration: string | null;
  country_slug: string;
  ancestors: { name: string; slug: string; live: boolean }[];
  places: SummaryRow[];
  related: SummaryRow[];
  gallery: MediaRow[];
  tips: { title: string; body: string }[];
  visa: VisaSummaryRow;
  seo: Parameters<typeof toSeo>[0];
};

const SUMMARY_JSON = (alias: string) => `json_build_object(
  'id', ${alias}.id, 'name', ${alias}.name, 'slug', ${alias}.slug, 'type', ${alias}.type, 'scope', ${alias}.scope,
  'short_description', ${alias}.short_description, 'is_sample', ${alias}.is_sample,
  'image', ${mediaJson(`${alias}.hero_media_id`)},
  'country_name', (select name from public.countries where id = ${alias}.country_id),
  'region_name', (select r2.name from public.countries c2 left join public.regions r2 on r2.id = c2.region_id where c2.id = ${alias}.country_id),
  'tour_count', ${tourCount(`${alias}.id`)})`;

export async function findDestinationBySlug(slug: string): Promise<DestinationDetail | null> {
  const row = await queryOne<DetailRow>(
    `select ${SUMMARY_COLUMNS},
       d.description, d.best_time_to_visit, d.best_months, d.ideal_duration, c.slug as country_slug,
       (select coalesce(json_agg(json_build_object('name', a.name, 'slug', a.slug, 'live', ${live("a")}) order by a.depth desc), '[]'::json)
          from (select d1.*, 1 as depth from public.destinations d1 where d1.id = d.parent_id
                union all
                select d2.*, 2 from public.destinations d2
                 where d2.id = (select parent_id from public.destinations where id = d.parent_id)) a) as ancestors,
       (select coalesce(json_agg(${SUMMARY_JSON("ch")} order by ch.sort_order, ch.name), '[]'::json)
          from public.destinations ch where ch.parent_id = d.id and ${live("ch")}) as places,
       -- related: other top-level destinations in the same region
       (select coalesce(json_agg(${SUMMARY_JSON("rel")}), '[]'::json)
          from (select rd.* from public.destinations rd
                  join public.countries rc on rc.id = rd.country_id
                 where ${live("rd")} and rd.id <> d.id and rd.parent_id is null
                   and rc.region_id is not distinct from c.region_id
                 order by rd.is_featured desc, rd.sort_order limit 4) rel) as related,
       ${galleryJson("destination_media", "destination_id", "d.id")} as gallery,
       (select coalesce(json_agg(json_build_object('title', t.title, 'body', t.body) order by t.sort_order), '[]'::json)
          from public.destination_travel_tips t where t.destination_id = d.id) as tips,
       ${visaSummaryJson("d.country_id")} as visa,
       ${seoJson("d.seo_meta_id")} as seo
     ${FROM_VISIBLE} and d.slug = $1`,
    [slug],
  );
  if (!row) return null;

  const ancestors: LinkRef[] = row.ancestors
    .filter((a) => a.live)
    .map((a) => ({ name: a.name, href: routes.destination(a.slug) }));
  const type = row.type.toUpperCase() as DestinationDetail["type"];

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type,
    region: regionLine(row),
    regionName: row.region_name ?? row.country_name,
    tagline: opt(row.short_description),
    scope: toScope(row.scope),
    href: routes.destination(row.slug),
    image: toImage(row.image),
    isSample: row.is_sample,
    description: nonEmptyDoc(row.description),
    bestTimeToVisit: opt(row.best_time_to_visit),
    bestMonths: row.best_months ?? [],
    averageDuration: opt(row.ideal_duration),
    travelTips: row.tips.map((t) => ({ title: t.title, description: t.body })),
    country: { name: row.country_name, slug: row.country_slug, href: routes.destinations() },
    ancestors,
    places: summaries(row.places),
    gallery: toGallery(row.gallery),
    related: summaries(row.related),
    tourCount: row.tour_count,
    visa: toVisaSummary(row.visa),
    seo: toSeo(row.seo),
  };
}

export async function findFaqsForDestination(slug: string) {
  const row = await queryOne<{ faqs: { id: string; question: string; answer: string; isSample: boolean }[] }>(
    `select ${faqsJson("destination_id", "d.id")} as faqs ${FROM_VISIBLE} and d.slug = $1`,
    [slug],
  );
  return row?.faqs ?? [];
}

export async function findCountryBySlug(slug: string): Promise<CountryDetail | null> {
  const row = await queryOne<{
    id: string;
    name: string;
    slug: string;
    short_description: string | null;
    description: RichTextDoc | null;
    image: MediaRow;
    region_name: string | null;
    region_slug: string | null;
    destinations: SummaryRow[];
    visa: VisaSummaryRow;
    seo: Parameters<typeof toSeo>[0];
  }>(
    `select c.id, c.name, c.slug, c.short_description, c.description, ${mediaJson("c.hero_media_id")} as image,
            r.name as region_name, r.slug as region_slug,
            (select coalesce(json_agg(${SUMMARY_JSON("cd")} order by cd.sort_order, cd.name), '[]'::json)
               from public.destinations cd where cd.country_id = c.id and ${live("cd")}) as destinations,
            ${visaSummaryJson("c.id")} as visa,
            ${seoJson("c.seo_meta_id")} as seo
       from public.countries c left join public.regions r on r.id = c.region_id
      where c.slug = $1 and c.status = 'published' and c.deleted_at is null`,
    [slug],
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    region: { name: row.region_name ?? "", slug: row.region_slug ?? "" },
    shortDescription: opt(row.short_description),
    description: nonEmptyDoc(row.description),
    image: toImage(row.image),
    destinations: summaries(row.destinations),
    visaHref: toVisaSummary(row.visa)?.href,
    seo: toSeo(row.seo),
  };
}

/** Regions with the countries that have published destinations (navigation, destination index). */
export async function findRegionsWithCountries() {
  const rows = await query<{ name: string; slug: string; countries: { name: string; slug: string }[] }>(
    `select r.name, r.slug,
            (select coalesce(json_agg(json_build_object('name', c.name, 'slug', c.slug) order by c.name), '[]'::json)
               from public.countries c
              where c.region_id = r.id and c.deleted_at is null
                and exists (select 1 from public.destinations d where d.country_id = c.id and ${live("d")})) as countries
       from public.regions r order by r.sort_order, r.name`,
  );
  return rows.filter((r) => r.countries.length > 0);
}
