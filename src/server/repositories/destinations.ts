import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { CountryDetail, DestinationDetail, DestinationSummary, LinkRef, TourScope } from "@/types/content";
import { routes } from "@/lib/routes";
import { mediaSelect, opt, seoSelect, toImage, toSeo, visible, visiblePackage } from "./shared";
import { defaultVisaGuide, toVisaSummary } from "./visa-summary";

// ---------------------------------------------------------------------------
// Summaries (cards)
// ---------------------------------------------------------------------------

const packageCount = { _count: { select: { packages: { where: visiblePackage } } } } as const;

const summarySelect = {
  id: true,
  name: true,
  slug: true,
  type: true,
  scope: true,
  shortDescription: true,
  isSample: true,
  featuredImage: { select: mediaSelect },
  country: { select: { name: true, region: { select: { name: true } } } },
  ...packageCount,
  // Tours in cities/places inside this destination count towards it too.
  children: { where: visible, select: packageCount },
} satisfies Prisma.DestinationSelect;

type SummaryRow = Prisma.DestinationGetPayload<{ select: typeof summarySelect }>;

const countTours = (row: SummaryRow) =>
  row._count.packages + row.children.reduce((sum, child) => sum + child._count.packages, 0);

/** A country card shows its region; a city or place shows its country. */
const regionLine = (row: { type: string; country: { name: string; region: { name: string } } }) =>
  row.type === "COUNTRY" ? row.country.region.name : row.country.name;

/** Cards need a photo: rows without one are skipped rather than rendered broken. */
function toSummary(row: SummaryRow): DestinationSummary | null {
  const image = toImage(row.featuredImage);
  if (!image) return null;
  return {
    id: row.id,
    name: row.name,
    region: regionLine(row),
    tagline: opt(row.shortDescription),
    scope: row.scope,
    href: routes.destination(row.scope, row.slug),
    image,
    tourCount: countTours(row),
    isSample: row.isSample,
  };
}

const summaries = (rows: SummaryRow[]) =>
  rows.map(toSummary).filter((d): d is DestinationSummary => d !== null);

const listOrder = [{ sortOrder: "asc" }, { name: "asc" }] satisfies Prisma.DestinationOrderByWithRelationInput[];

export async function findFeaturedDestinations(limit = 8) {
  const rows = await db.destination.findMany({
    where: { ...visible, isFeatured: true },
    orderBy: listOrder,
    take: limit,
    select: summarySelect,
  });
  return summaries(rows);
}

/** Top-level destinations (countries and Indian regions) for a scope or for all. */
export async function findTopLevelDestinations(scope?: TourScope) {
  const rows = await db.destination.findMany({
    where: { ...visible, parentId: null, ...(scope && { scope }) },
    orderBy: listOrder,
    select: summarySelect,
  });
  return summaries(rows);
}

/** Every published destination in a country (visa pages: "related destinations"). */
export async function findDestinationsByCountry(countrySlug: string) {
  const rows = await db.destination.findMany({
    where: { ...visible, country: { slug: countrySlug } },
    orderBy: [{ parentId: { sort: "asc", nulls: "first" } }, ...listOrder],
    select: summarySelect,
  });
  return summaries(rows);
}

/** Slugs for static generation, per scope. */
export async function findDestinationSlugs(scope: TourScope) {
  const rows = await db.destination.findMany({
    where: { ...visible, scope },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

/** Minimal lookup used to redirect a destination requested under the wrong scope. */
export async function findDestinationScope(slug: string) {
  const row = await db.destination.findFirst({ where: { ...visible, slug }, select: { scope: true } });
  return row?.scope ?? null;
}

// ---------------------------------------------------------------------------
// Detail page
// ---------------------------------------------------------------------------

const ancestorFields = { name: true, slug: true, scope: true, status: true } as const;

type AncestorRow = { name: string; slug: string; scope: TourScope; status: string };

/** Up to two parent levels (place -> city -> country), outermost first. */
function toAncestors(...chain: (AncestorRow | null | undefined)[]): LinkRef[] {
  return chain
    .filter((a): a is AncestorRow => a?.status === "PUBLISHED")
    .reverse()
    .map((a) => ({ name: a.name, href: routes.destination(a.scope, a.slug) }));
}

export async function findDestinationBySlug(slug: string): Promise<DestinationDetail | null> {
  const row = await db.destination.findFirst({
    where: { ...visible, slug },
    select: {
      ...summarySelect,
      description: true,
      bestTimeToVisit: true,
      averageDuration: true,
      country: {
        select: {
          name: true,
          slug: true,
          region: { select: { name: true } },
          visaGuides: defaultVisaGuide,
        },
      },
      parent: { select: { ...ancestorFields, parent: { select: ancestorFields } } },
      children: { where: visible, orderBy: listOrder, select: summarySelect },
      gallery: { orderBy: { sortOrder: "asc" }, select: { media: { select: mediaSelect } } },
      related: { where: visible, orderBy: listOrder, take: 4, select: summarySelect },
      seo: { select: seoSelect },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    region: regionLine(row),
    regionName: row.country.region.name,
    tagline: opt(row.shortDescription),
    scope: row.scope,
    href: routes.destination(row.scope, row.slug),
    image: toImage(row.featuredImage),
    isSample: row.isSample,
    description: opt(row.description),
    bestTimeToVisit: opt(row.bestTimeToVisit),
    averageDuration: opt(row.averageDuration),
    country: { name: row.country.name, slug: row.country.slug, href: routes.destinations() },
    ancestors: toAncestors(row.parent, row.parent?.parent),
    places: summaries(row.children),
    gallery: row.gallery.map((g) => toImage(g.media)).filter((i) => i !== undefined),
    related: summaries(row.related),
    tourCount: row._count.packages + row.children.reduce((sum, c) => sum + c._count.packages, 0),
    visa: toVisaSummary(row.country.visaGuides[0]),
    seo: toSeo(row.seo),
  };
}

export async function findCountryBySlug(slug: string): Promise<CountryDetail | null> {
  const row = await db.country.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      featuredImage: { select: mediaSelect },
      region: { select: { name: true, slug: true } },
      visaGuides: defaultVisaGuide,
      destinations: { where: visible, orderBy: listOrder, select: summarySelect },
      seo: { select: seoSelect },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    region: row.region,
    shortDescription: opt(row.shortDescription),
    description: opt(row.description),
    image: toImage(row.featuredImage),
    destinations: summaries(row.destinations),
    visaHref: toVisaSummary(row.visaGuides[0])?.href,
    seo: toSeo(row.seo),
  };
}

/** Published regions with their published countries (navigation, destination index). */
export async function findRegionsWithCountries() {
  return db.region.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      name: true,
      slug: true,
      countries: {
        where: { status: "PUBLISHED" },
        orderBy: { name: "asc" },
        select: { name: true, slug: true },
      },
    },
  });
}
