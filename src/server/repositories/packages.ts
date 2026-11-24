import "server-only";
import { query, queryOne } from "@/lib/db";
import type {
  ItineraryDayView,
  LinkRef,
  PolicyView,
  PricePlanView,
  TourCategoryDetail,
  TourFilters,
  TourPackageDetail,
  TourSummary,
  DepartureView,
} from "@/types/content";
import { routes } from "@/lib/routes";
import { priceBasisLabel } from "@/lib/labels";
import { nonEmptyDoc, type RichTextDoc } from "@/lib/rich-text";
import {
  faqsJson,
  fromScope,
  galleryJson,
  live,
  liveNoSample,
  mediaJson,
  opt,
  seoJson,
  toGallery,
  toImage,
  toIso,
  toScope,
  toSeo,
  type MediaRow,
} from "./shared";
import { toVisaSummary, visaSummaryJson, type VisaSummaryRow } from "./visa-summary";

// ---------------------------------------------------------------------------
// Card (summary) query parts
// ---------------------------------------------------------------------------

const SUMMARY_COLUMNS = `
  p.id, p.name, p.slug, p.short_description, p.duration_days, p.duration_nights,
  p.starting_price, p.currency, p.is_sample, p.is_featured, p.published_at,
  d.name as destination_name,
  ${mediaJson("p.hero_media_id")} as image,
  (select pp.price_basis from public.package_prices pp
    where pp.package_id = p.id and pp.is_active and pp.adult_twin_sharing = p.starting_price limit 1) as price_basis,
  (select coalesce(json_agg(json_build_object('name', c.name, 'slug', c.slug) order by c.sort_order), '[]'::json)
     from public.package_category_links l join public.package_categories c on c.id = l.category_id
    where l.package_id = p.id and ${live("c")}) as categories`;

const FROM_VISIBLE = `
  from public.packages p
  join public.destinations d on d.id = p.primary_destination_id
  where ${live("p")} and ${live("d")}`;

const LIST_ORDER = `order by p.is_featured desc, p.sort_order asc, p.published_at desc, p.id`;

type SummaryRow = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  duration_days: number;
  duration_nights: number;
  starting_price: number | null;
  currency: string;
  is_sample: boolean;
  is_featured: boolean;
  published_at: Date;
  destination_name: string;
  image: MediaRow;
  price_basis: keyof typeof priceBasisLabel | null;
  categories: { name: string; slug: string }[];
};

function summaryFields(row: SummaryRow) {
  return {
    id: row.id,
    name: row.name,
    href: routes.tour(row.slug),
    destination: row.destination_name,
    durationDays: row.duration_days,
    durationNights: row.duration_nights,
    summary: opt(row.short_description),
    categories: row.categories.map((c) => c.name),
    price: {
      amount: row.starting_price,
      currency: row.currency,
      note: row.price_basis ? priceBasisLabel[row.price_basis] : undefined,
    },
    isSample: row.is_sample,
  };
}

/** Cards need a photo: packages without one are skipped rather than rendered broken. */
function toSummaries(rows: SummaryRow[]): TourSummary[] {
  return rows.flatMap((row) => {
    const image = toImage(row.image);
    return image ? [{ ...summaryFields(row), image }] : [];
  });
}

// ---------------------------------------------------------------------------
// Filters (values come from the URL and are always parameterised)
// ---------------------------------------------------------------------------

const DURATION_SQL = {
  short: "p.duration_days <= 4",
  week: "p.duration_days between 5 and 8",
  long: "p.duration_days >= 9",
} as const;

function filterSql(filters: TourFilters, params: unknown[]) {
  const where: string[] = [];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  if (filters.scope) where.push(`p.scope = ${add(fromScope(filters.scope))}`);
  if (filters.country) {
    where.push(`exists (select 1 from public.package_destinations pd
      join public.destinations dd on dd.id = pd.destination_id
      join public.countries cc on cc.id = dd.country_id
      where pd.package_id = p.id and cc.slug = ${add(filters.country)})`);
  }
  if (filters.destination) {
    // At the destination or any city/place inside it, including multi-country trips.
    const slug = add(filters.destination);
    where.push(`exists (select 1 from public.package_destinations pd
      join public.destinations dd on dd.id = pd.destination_id
      left join public.destinations dp on dp.id = dd.parent_id
      where pd.package_id = p.id and (dd.slug = ${slug} or dp.slug = ${slug}))`);
  }
  if (filters.category) {
    where.push(`exists (select 1 from public.package_category_links l
      join public.package_categories c on c.id = l.category_id
      where l.package_id = p.id and c.slug = ${add(filters.category)} and ${live("c")})`);
  }
  if (filters.duration) where.push(DURATION_SQL[filters.duration]);
  if (filters.maxPrice) where.push(`p.starting_price <= ${add(filters.maxPrice)}`);
  return where.length ? ` and ${where.join(" and ")}` : "";
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export async function findFeaturedPackages(limit = 6, filters: TourFilters = {}) {
  const params: unknown[] = [];
  const where = filterSql(filters, params);
  params.push(limit);
  const rows = await query<SummaryRow>(
    `select ${SUMMARY_COLUMNS} ${FROM_VISIBLE} and p.is_featured ${where} ${LIST_ORDER} limit $${params.length}`,
    params,
  );
  return toSummaries(rows);
}

/** Tour listing with optional filters (capped; keyset pagination when volume needs it). */
export async function findPackages(filters: TourFilters = {}, limit = 60) {
  const params: unknown[] = [];
  const where = filterSql(filters, params);
  params.push(limit);
  const rows = await query<SummaryRow>(
    `select ${SUMMARY_COLUMNS} ${FROM_VISIBLE} ${where} ${LIST_ORDER} limit $${params.length}`,
    params,
  );
  return toSummaries(rows);
}

/**
 * Options for the filter form, derived from what is actually listed in the
 * base set (e.g. only destinations that have international tours).
 */
export async function findListingFacets(base: Pick<TourFilters, "scope" | "category">) {
  const params: unknown[] = [];
  const where = filterSql(base, params);
  const rows = await query<{
    duration_days: number;
    starting_price: number | null;
    top_slug: string;
    top_name: string;
    categories: { name: string; slug: string }[];
  }>(
    `select p.duration_days, p.starting_price,
            coalesce(case when ${live("dp")} then dp.slug end, d.slug) as top_slug,
            coalesce(case when ${live("dp")} then dp.name end, d.name) as top_name,
            (select coalesce(json_agg(json_build_object('name', c.name, 'slug', c.slug)), '[]'::json)
               from public.package_category_links l join public.package_categories c on c.id = l.category_id
              where l.package_id = p.id and ${live("c")}) as categories
       from public.packages p
       join public.destinations d on d.id = p.primary_destination_id
       left join public.destinations dp on dp.id = d.parent_id
      where ${live("p")} and ${live("d")} ${where}`,
    params,
  );

  const destinations = new Map<string, string>();
  const categories = new Map<string, string>();
  const durations = new Set<keyof typeof DURATION_SQL>();
  let hasPrices = false;
  for (const row of rows) {
    destinations.set(row.top_slug, row.top_name);
    row.categories.forEach((c) => categories.set(c.slug, c.name));
    durations.add(row.duration_days <= 4 ? "short" : row.duration_days <= 8 ? "week" : "long");
    if (row.starting_price) hasPrices = true;
  }
  const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label);
  return {
    destinations: [...destinations].map(([value, label]) => ({ value, label })).sort(byLabel),
    categories: [...categories].map(([value, label]) => ({ value, label })).sort(byLabel),
    durations: (["short", "week", "long"] as const).filter((d) => durations.has(d)),
    hasPrices,
    total: rows.length,
  };
}

// ---------------------------------------------------------------------------
// Static generation + proxy helpers
// ---------------------------------------------------------------------------

export async function findPackageSlugs() {
  const rows = await query<{ slug: string }>(`select p.slug ${FROM_VISIBLE}`);
  return rows.map((r) => r.slug);
}

export async function packageExists(slug: string) {
  return Boolean(await queryOne(`select 1 ${FROM_VISIBLE} and p.slug = $1`, [slug]));
}

// ---------------------------------------------------------------------------
// Detail page (one query)
// ---------------------------------------------------------------------------

type DetailRow = SummaryRow & {
  description: RichTextDoc | null;
  important_notes: RichTextDoc | null;
  departure_type: "flexible" | "fixed_departure";
  scope: string;
  destination_slug: string;
  ancestors: { name: string; slug: string; live: boolean }[];
  highlights: { title: string; description: string | null; icon: string | null }[];
  days: {
    day: number;
    title: string;
    description: string | null;
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    location: string | null;
    hotel: string | null;
    note: string | null;
    image: MediaRow;
    items: { title: string; kind: ItineraryActivityKind; optional: boolean }[];
  }[];
  hotels: {
    name: string;
    city: string | null;
    nights: number;
    star_rating: number | null;
    room_type: string | null;
    meal_plan: string | null;
    website: string | null;
    is_or_similar: boolean;
  }[];
  inclusions: { included: boolean; title: string; description: string | null; type: string | null }[];
  prices: {
    name: string;
    valid_from: string | null;
    valid_to: string | null;
    basis: PricePlanView["basis"];
    currency: string;
    adult_twin: number | null;
    adult_triple: number | null;
    child_bed: number | null;
    child_no_bed: number | null;
    infant: number | null;
    single: number | null;
    gst: boolean;
    notes: string | null;
  }[];
  departures: {
    date: string;
    return_date: string | null;
    status: DepartureView["status"];
    seats: number | null;
    price: number | null;
  }[];
  policies: { kind: PolicyView["kind"]; title: string; body: RichTextDoc }[];
  gallery: MediaRow[];
  visa: VisaSummaryRow;
  seo: Parameters<typeof toSeo>[0];
  faqs: unknown;
};

type ItineraryActivityKind = "activity" | "sightseeing" | "transfer" | "place";

export async function findPackageBySlug(slug: string): Promise<TourPackageDetail | null> {
  const row = await queryOne<DetailRow>(
    `select ${SUMMARY_COLUMNS},
       p.description, p.important_notes, p.departure_type, p.scope, d.slug as destination_slug,
       -- parent chain of the primary destination, outermost first (max 2 levels)
       (select coalesce(json_agg(json_build_object('name', a.name, 'slug', a.slug, 'live', ${live("a")})
                                 order by a.depth desc), '[]'::json)
          from (select d1.*, 1 as depth from public.destinations d1 where d1.id = d.parent_id
                union all
                select d2.*, 2 from public.destinations d2
                  where d2.id = (select parent_id from public.destinations where id = d.parent_id)) a) as ancestors,
       (select coalesce(json_agg(json_build_object('title', h.title, 'description', h.description, 'icon', h.icon)
                                 order by h.sort_order), '[]'::json)
          from public.package_highlights h where h.package_id = p.id) as highlights,
       (select coalesce(json_agg(json_build_object(
                 'day', it.day_number, 'title', it.title, 'description', it.description,
                 'breakfast', it.breakfast, 'lunch', it.lunch, 'dinner', it.dinner,
                 'location', od.name, 'hotel', ho.name, 'note', it.accommodation_note,
                 'image', ${mediaJson("it.media_id")},
                 'items', (select coalesce(json_agg(json_build_object('title', x.title, 'kind', x.kind, 'optional', x.is_optional)
                                                    order by x.sort_order), '[]'::json)
                             from public.itinerary_day_items x where x.itinerary_day_id = it.id)
               ) order by it.day_number), '[]'::json)
          from public.itinerary_days it
          left join public.destinations od on od.id = it.overnight_destination_id
          left join public.hotels ho on ho.id = it.hotel_id and ho.deleted_at is null
         where it.package_id = p.id) as days,
       (select coalesce(json_agg(json_build_object(
                 'name', h.name, 'city', hd.name, 'nights', ph.nights, 'star_rating', h.star_rating,
                 'room_type', ph.room_type, 'meal_plan', ph.meal_plan, 'website', h.website,
                 'is_or_similar', ph.is_or_similar) order by ph.sort_order), '[]'::json)
          from public.package_hotels ph
          join public.hotels h on h.id = ph.hotel_id and h.deleted_at is null
          left join public.destinations hd on hd.id = h.destination_id
         where ph.package_id = p.id) as hotels,
       (select coalesce(json_agg(json_build_object('included', i.is_included, 'title', i.title,
                                                   'description', i.description, 'type', t.code)
                                 order by i.is_included desc, i.sort_order), '[]'::json)
          from public.package_inclusions i left join public.inclusion_types t on t.id = i.inclusion_type_id
         where i.package_id = p.id) as inclusions,
       (select coalesce(json_agg(json_build_object(
                 'name', pr.plan_name, 'valid_from', pr.valid_from, 'valid_to', pr.valid_to, 'basis', pr.price_basis,
                 'currency', pr.currency, 'adult_twin', pr.adult_twin_sharing, 'adult_triple', pr.adult_triple_sharing,
                 'child_bed', pr.child_with_bed, 'child_no_bed', pr.child_without_bed, 'infant', pr.infant,
                 'single', pr.single_supplement, 'gst', pr.includes_gst, 'notes', pr.notes)
               order by pr.sort_order, pr.adult_twin_sharing nulls last), '[]'::json)
          from public.package_prices pr
         where pr.package_id = p.id and pr.is_active
           and (pr.valid_to is null or pr.valid_to >= current_date)) as prices,
       (select coalesce(json_agg(json_build_object(
                 'date', dep.departure_date, 'return_date', dep.return_date, 'status', dep.status,
                 'seats', dep.seats_available,
                 'price', coalesce(dep.price_override, (select adult_twin_sharing from public.package_prices where id = dep.price_id)))
               order by dep.departure_date), '[]'::json)
          from public.package_departures dep
         where dep.package_id = p.id and dep.status <> 'cancelled' and dep.departure_date >= current_date) as departures,
       (select coalesce(json_agg(json_build_object('kind', po.kind, 'title', po.title, 'body', po.body)
                                 order by po.kind), '[]'::json)
          from public.policies po
         where po.id in (p.terms_policy_id, p.cancellation_policy_id, p.payment_policy_id) and ${liveNoSample("po")}) as policies,
       ${galleryJson("package_media", "package_id", "p.id")} as gallery,
       ${visaSummaryJson("d.country_id")} as visa,
       ${seoJson("p.seo_meta_id")} as seo
     ${FROM_VISIBLE} and p.slug = $1`,
    [slug],
  );
  if (!row) return null;

  const scope = toScope(row.scope);
  const ancestors: LinkRef[] = row.ancestors
    .filter((a) => a.live)
    .map((a) => ({ name: a.name, href: routes.destination(a.slug) }));
  const list = (items: { title: string; description: string | null }[]) =>
    items.map((i) => ({ title: i.title, description: opt(i.description) }));
  const included = row.inclusions.filter((i) => i.included);

  return {
    ...summaryFields(row),
    slug: row.slug,
    image: toImage(row.image),
    description: nonEmptyDoc(row.description),
    importantInfo: nonEmptyDoc(row.important_notes),
    departureType: row.departure_type,
    publishedAt: toIso(row.published_at),
    destinationRef: {
      name: row.destination_name,
      slug: row.destination_slug,
      scope,
      href: routes.destination(row.destination_slug),
    },
    destinationAncestors: ancestors,
    topDestinationSlug: row.ancestors.filter((a) => a.live)[0]?.slug ?? row.destination_slug,
    categoryRefs: row.categories.map((c) => ({ name: c.name, slug: c.slug, href: routes.tourCategory(c.slug) })),
    highlights: row.highlights.map((h) => ({ title: h.title, description: opt(h.description), icon: opt(h.icon) })),
    itinerary: row.days.map((d) => ({
      dayNumber: d.day,
      title: d.title,
      description: opt(d.description),
      meals: { breakfast: d.breakfast, lunch: d.lunch, dinner: d.dinner },
      activities: d.items,
      location: opt(d.location),
      accommodation: d.hotel ?? opt(d.note),
      image: toImage(d.image),
    })),
    hotels: row.hotels.map((h) => ({
      name: h.name,
      city: opt(h.city),
      nights: h.nights,
      starRating: opt(h.star_rating),
      roomType: opt(h.room_type),
      mealPlan: opt(h.meal_plan),
      website: opt(h.website),
      isOption: h.is_or_similar,
    })),
    inclusions: list(included),
    exclusions: list(row.inclusions.filter((i) => !i.included)),
    includedTypes: [...new Set(included.map((i) => i.type).filter((t): t is string => Boolean(t)))],
    prices: row.prices.map((p) => ({
      name: p.name,
      validFrom: opt(p.valid_from),
      validTo: opt(p.valid_to),
      basis: p.basis,
      currency: p.currency,
      adultTwin: p.adult_twin,
      adultTriple: p.adult_triple,
      childWithBed: p.child_bed,
      childWithoutBed: p.child_no_bed,
      infant: p.infant,
      singleSupplement: p.single,
      includesGst: p.gst,
      notes: opt(p.notes),
    })),
    departures: row.departures.map((d) => ({
      date: d.date,
      returnDate: opt(d.return_date),
      status: d.status,
      seatsAvailable: opt(d.seats),
      price: d.price,
      currency: row.currency,
    })),
    policies: row.policies.filter((p) => nonEmptyDoc(p.body)),
    gallery: toGallery(row.gallery),
    visa: toVisaSummary(row.visa),
    seo: toSeo(row.seo),
  };
}

export async function findFaqsForPackage(slug: string) {
  const row = await queryOne<{ faqs: { id: string; question: string; answer: string; isSample: boolean }[] }>(
    `select ${faqsJson("package_id", "p.id")} as faqs ${FROM_VISIBLE} and p.slug = $1`,
    [slug],
  );
  return row?.faqs ?? [];
}

/**
 * Related tours, scored: same top destination 3, each shared travel style 2,
 * similar length (±2 days) 1, featured 1. Never includes the current package.
 */
export async function findRelatedPackages(
  pkg: Pick<TourPackageDetail, "id" | "topDestinationSlug" | "categoryRefs" | "durationDays">,
  limit = 3,
) {
  const rows = await query<SummaryRow & { top_slug: string }>(
    `select ${SUMMARY_COLUMNS}, coalesce(dp.slug, d.slug) as top_slug
       from public.packages p
       join public.destinations d on d.id = p.primary_destination_id
       left join public.destinations dp on dp.id = d.parent_id
      where ${live("p")} and ${live("d")} and p.id <> $1
      ${LIST_ORDER} limit 40`,
    [pkg.id],
  );
  const categorySlugs = new Set(pkg.categoryRefs.map((c) => c.slug));
  const score = (c: (typeof rows)[number]) =>
    (c.top_slug === pkg.topDestinationSlug ? 3 : 0) +
    c.categories.filter((cat) => categorySlugs.has(cat.slug)).length * 2 +
    (Math.abs(c.duration_days - pkg.durationDays) <= 2 ? 1 : 0) +
    (c.is_featured ? 1 : 0);
  const ranked = rows
    .map((c, index) => ({ c, s: score(c), index }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.index - b.index)
    .slice(0, limit)
    .map((x) => x.c);
  return toSummaries(ranked);
}

// ---------------------------------------------------------------------------
// Homepage showcase itinerary
// ---------------------------------------------------------------------------

/**
 * The featured package with the most illustrated itinerary, for the homepage
 * scroll story. Days without a photo borrow the package photo.
 */
export async function findShowcaseItinerary(): Promise<{
  tourName: string;
  href: string;
  isSample: boolean;
  days: ItineraryDayView[];
} | null> {
  const rows = await query<{
    name: string;
    slug: string;
    is_sample: boolean;
    image: MediaRow;
    days: { day: number; title: string; description: string | null; location: string | null; image: MediaRow }[];
  }>(
    `select p.name, p.slug, p.is_sample, ${mediaJson("p.hero_media_id")} as image,
            (select coalesce(json_agg(json_build_object('day', x.day_number, 'title', x.title,
                      'description', x.description, 'location', x.location, 'image', x.image) order by x.day_number), '[]'::json)
               from (select it.day_number, it.title, it.description, od.name as location, ${mediaJson("it.media_id")} as image
                       from public.itinerary_days it
                       left join public.destinations od on od.id = it.overnight_destination_id
                      where it.package_id = p.id order by it.day_number limit 4) x) as days
       ${FROM_VISIBLE} and p.is_featured and p.hero_media_id is not null
       ${LIST_ORDER} limit 6`,
  );
  const best = rows
    .filter((r) => r.days.length >= 3)
    .sort((a, b) => b.days.filter((d) => d.image).length - a.days.filter((d) => d.image).length)[0];
  const fallback = toImage(best?.image);
  if (!best || !fallback) return null;
  return {
    tourName: best.name,
    href: routes.tour(best.slug),
    isSample: best.is_sample,
    days: best.days.map((d) => ({
      dayNumber: d.day,
      title: d.title,
      location: opt(d.location),
      description: d.description ?? "",
      image: toImage(d.image) ?? fallback,
    })),
  };
}

// ---------------------------------------------------------------------------
// Package categories (travel styles)
// ---------------------------------------------------------------------------

type CategoryRow = {
  name: string;
  slug: string;
  description: string | null;
  image: MediaRow;
  package_count: number;
};

const CATEGORY_COLUMNS = `
  c.name, c.slug, c.description, ${mediaJson("c.hero_media_id")} as image,
  (select count(*) from public.package_category_links l
     join public.packages p on p.id = l.package_id
     join public.destinations d on d.id = p.primary_destination_id
    where l.category_id = c.id and ${live("p")} and ${live("d")}) as package_count`;

export async function findTourCategories() {
  const rows = await query<CategoryRow>(
    `select ${CATEGORY_COLUMNS} from public.package_categories c where ${live("c")} order by c.sort_order, c.name`,
  );
  return rows.map((c) => ({
    id: c.slug,
    name: c.name,
    description: c.description ?? "",
    href: routes.tourCategory(c.slug),
    image: toImage(c.image),
    tourCount: c.package_count,
  }));
}

export async function findTourCategoryBySlug(slug: string): Promise<TourCategoryDetail | null> {
  const row = await queryOne<CategoryRow & { seo: Parameters<typeof toSeo>[0] }>(
    `select ${CATEGORY_COLUMNS}, ${seoJson("c.seo_meta_id")} as seo
       from public.package_categories c where ${live("c")} and c.slug = $1`,
    [slug],
  );
  if (!row) return null;
  return {
    name: row.name,
    slug: row.slug,
    href: routes.tourCategory(row.slug),
    description: opt(row.description),
    image: toImage(row.image),
    seo: toSeo(row.seo),
    tourCount: row.package_count,
  };
}

export async function findTourCategorySlugs() {
  const rows = await query<{ slug: string }>(`select c.slug from public.package_categories c where ${live("c")}`);
  return rows.map((r) => r.slug);
}

/** Specific packages, in the order given (blog "tours in this article"). */
export async function findPackagesBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [];
  const rows = await query<SummaryRow>(
    `select ${SUMMARY_COLUMNS} ${FROM_VISIBLE} and p.slug = any($1::text[]) order by array_position($1::text[], p.slug::text)`,
    [slugs],
  );
  return toSummaries(rows);
}
