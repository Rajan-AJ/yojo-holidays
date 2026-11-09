import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type {
  ItineraryDayView,
  LinkRef,
  TourCategoryDetail,
  TourFilters,
  TourPackageDetail,
  TourScope,
  TourSummary,
} from "@/types/content";
import { routes } from "@/lib/routes";
import { mediaSelect, opt, seoSelect, toImage, toIso, toNumber, toSeo, visiblePackage } from "./shared";
import { defaultVisaGuide, toVisaSummary, visaSummarySelect } from "./visa-summary";

const listOrder = [
  { isFeatured: "desc" },
  { sortOrder: "asc" },
  { publishedAt: "desc" },
] satisfies Prisma.TourPackageOrderByWithRelationInput[];

const summarySelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  durationDays: true,
  durationNights: true,
  startingPrice: true,
  currency: true,
  priceNote: true,
  isSample: true,
  featuredImage: { select: mediaSelect },
  destination: { select: { name: true, slug: true, scope: true } },
  categories: {
    where: { status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    select: { name: true, slug: true },
  },
} satisfies Prisma.TourPackageSelect;

type SummaryRow = Prisma.TourPackageGetPayload<{ select: typeof summarySelect }>;

function summaryFields(row: SummaryRow) {
  return {
    id: row.id,
    name: row.name,
    href: routes.tour(row.destination.scope, row.destination.slug, row.slug),
    destination: row.destination.name,
    durationDays: row.durationDays,
    durationNights: row.durationNights,
    summary: opt(row.shortDescription),
    categories: row.categories.map((c) => c.name),
    price: { amount: toNumber(row.startingPrice), currency: row.currency, note: opt(row.priceNote) },
    isSample: row.isSample,
  };
}

/** Cards need a photo: packages without one are skipped rather than rendered broken. */
function toSummaries(rows: SummaryRow[]): TourSummary[] {
  return rows.flatMap((row) => {
    const image = toImage(row.featuredImage);
    return image ? [{ ...summaryFields(row), image }] : [];
  });
}

/** Packages at a destination or at any city/place inside it. */
const atDestination = (slug: string) =>
  ({ OR: [{ slug }, { parent: { slug } }] }) satisfies Prisma.DestinationWhereInput;

const durationRange = {
  short: { lte: 4 },
  week: { gte: 5, lte: 8 },
  long: { gte: 9 },
} as const;

function filterWhere(filters: TourFilters): Prisma.TourPackageWhereInput {
  return {
    ...visiblePackage,
    destination: {
      ...visiblePackage.destination,
      ...(filters.scope && { scope: filters.scope }),
      ...(filters.country && { country: { slug: filters.country } }),
      ...(filters.destination && atDestination(filters.destination)),
    },
    ...(filters.category && { categories: { some: { slug: filters.category, status: "PUBLISHED" } } }),
    ...(filters.duration && { durationDays: durationRange[filters.duration] }),
    ...(filters.maxPrice && { startingPrice: { lte: filters.maxPrice } }),
  };
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export async function findFeaturedPackages(limit = 6, filters: TourFilters = {}) {
  const rows = await db.tourPackage.findMany({
    where: { ...filterWhere(filters), isFeatured: true },
    orderBy: listOrder,
    take: limit,
    select: summarySelect,
  });
  return toSummaries(rows);
}

/** Tour listing with optional filters. Capped; pagination arrives with real volume. */
export async function findPackages(filters: TourFilters = {}, limit = 60) {
  const rows = await db.tourPackage.findMany({
    where: filterWhere(filters),
    orderBy: listOrder,
    take: limit,
    select: summarySelect,
  });
  return toSummaries(rows);
}

/**
 * Options for the filter form, derived from what is actually listed in the
 * base set (e.g. only destinations that have international tours).
 */
export async function findListingFacets(base: Pick<TourFilters, "scope" | "category">) {
  const rows = await db.tourPackage.findMany({
    where: filterWhere(base),
    select: {
      durationDays: true,
      startingPrice: true,
      destination: {
        select: { name: true, slug: true, parent: { select: { name: true, slug: true, status: true } } },
      },
      categories: { where: { status: "PUBLISHED" }, select: { name: true, slug: true } },
    },
  });

  const destinations = new Map<string, string>();
  const categories = new Map<string, string>();
  const durations = new Set<keyof typeof durationRange>();
  let hasPrices = false;

  for (const row of rows) {
    // Filter by the top-level destination (Vietnam), not by Hanoi.
    const top = row.destination.parent?.status === "PUBLISHED" ? row.destination.parent : row.destination;
    destinations.set(top.slug, top.name);
    row.categories.forEach((c) => categories.set(c.slug, c.name));
    durations.add(row.durationDays <= 4 ? "short" : row.durationDays <= 8 ? "week" : "long");
    if (row.startingPrice) hasPrices = true;
  }

  const sortByLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label);
  return {
    destinations: [...destinations].map(([value, label]) => ({ value, label })).sort(sortByLabel),
    categories: [...categories].map(([value, label]) => ({ value, label })).sort(sortByLabel),
    durations: (["short", "week", "long"] as const).filter((d) => durations.has(d)),
    hasPrices,
    total: rows.length,
  };
}

// ---------------------------------------------------------------------------
// Static generation helpers
// ---------------------------------------------------------------------------

export async function findPackageParams(scope: TourScope) {
  const rows = await db.tourPackage.findMany({
    where: { ...visiblePackage, destination: { ...visiblePackage.destination, scope } },
    select: { slug: true, destination: { select: { slug: true } } },
  });
  return rows.map((r) => ({ destination: r.destination.slug, package: r.slug }));
}

/** Where a package actually lives, to redirect a wrong-scope URL to the canonical one. */
export async function findPackageScope(destinationSlug: string, packageSlug: string) {
  const row = await db.tourPackage.findFirst({
    where: { ...visiblePackage, slug: packageSlug, destination: { ...visiblePackage.destination, slug: destinationSlug } },
    select: { destination: { select: { scope: true } } },
  });
  return row?.destination.scope ?? null;
}

// ---------------------------------------------------------------------------
// Detail page
// ---------------------------------------------------------------------------

const ancestorFields = { name: true, slug: true, scope: true, status: true } as const;

/**
 * Full package for the detail page, looked up by BOTH public URL parts. A
 * package slug under the wrong destination returns null (-> 404), so
 * /international-tours/vietnam/{japan-package}/ can never render.
 */
export async function findPackageBySlug(
  destinationSlug: string,
  packageSlug: string,
): Promise<TourPackageDetail | null> {
  const row = await db.tourPackage.findFirst({
    where: {
      ...visiblePackage,
      slug: packageSlug,
      destination: { ...visiblePackage.destination, slug: destinationSlug },
    },
    select: {
      ...summarySelect,
      description: true,
      importantInfo: true,
      publishedAt: true,
      destination: {
        select: {
          name: true,
          slug: true,
          scope: true,
          parent: { select: { ...ancestorFields, parent: { select: ancestorFields } } },
          country: { select: { visaGuides: defaultVisaGuide } },
        },
      },
      highlights: {
        orderBy: { sortOrder: "asc" },
        select: { title: true, description: true, icon: true },
      },
      itineraryDays: {
        orderBy: { dayNumber: "asc" },
        select: {
          dayNumber: true,
          title: true,
          description: true,
          morningActivities: true,
          afternoonActivities: true,
          eveningActivities: true,
          breakfast: true,
          lunch: true,
          dinner: true,
          accommodationNote: true,
          destination: { select: { name: true } },
          hotel: { select: { name: true } },
          image: { select: mediaSelect },
        },
      },
      hotels: {
        orderBy: { sortOrder: "asc" },
        select: {
          city: true,
          nights: true,
          roomType: true,
          mealPlan: true,
          isOption: true,
          hotel: { select: { name: true, city: true, starRating: true, website: true } },
        },
      },
      inclusions: { orderBy: { sortOrder: "asc" }, select: { title: true, description: true } },
      exclusions: { orderBy: { sortOrder: "asc" }, select: { title: true, description: true } },
      gallery: { orderBy: { sortOrder: "asc" }, select: { media: { select: mediaSelect } } },
      // The package's own visa link wins; otherwise use its destination country's.
      visaCountry: { select: visaSummarySelect },
      seo: { select: seoSelect },
    },
  });
  if (!row) return null;

  const { scope, slug: destSlug, name: destName, parent } = row.destination;
  const list = (items: { title: string; description: string | null }[]) =>
    items.map((i) => ({ title: i.title, description: opt(i.description) }));
  const publishedAncestors = [parent?.parent, parent].filter(
    (a): a is NonNullable<typeof a> => a?.status === "PUBLISHED",
  );
  const ancestors: LinkRef[] = publishedAncestors.map((a) => ({
    name: a.name,
    href: routes.destination(a.scope, a.slug),
  }));

  return {
    ...summaryFields(row),
    slug: row.slug,
    image: toImage(row.featuredImage),
    description: opt(row.description),
    importantInfo: opt(row.importantInfo),
    publishedAt: toIso(row.publishedAt),
    destinationRef: { name: destName, slug: destSlug, scope, href: routes.destination(scope, destSlug) },
    destinationAncestors: ancestors,
    topDestinationSlug: publishedAncestors[0]?.slug ?? destSlug,
    categoryRefs: row.categories.map((c) => ({ name: c.name, slug: c.slug, href: routes.tourCategory(c.slug) })),
    highlights: row.highlights.map((h) => ({
      title: h.title,
      description: opt(h.description),
      icon: opt(h.icon),
    })),
    itinerary: row.itineraryDays.map((d) => ({
      dayNumber: d.dayNumber,
      title: d.title,
      description: opt(d.description),
      morning: opt(d.morningActivities),
      afternoon: opt(d.afternoonActivities),
      evening: opt(d.eveningActivities),
      meals: { breakfast: d.breakfast, lunch: d.lunch, dinner: d.dinner },
      location: opt(d.destination?.name),
      accommodation: d.hotel?.name ?? opt(d.accommodationNote),
      image: toImage(d.image),
    })),
    hotels: row.hotels.map((h) => ({
      name: h.hotel.name,
      city: opt(h.city ?? h.hotel.city),
      nights: h.nights,
      starRating: opt(h.hotel.starRating),
      roomType: opt(h.roomType),
      mealPlan: opt(h.mealPlan),
      website: opt(h.hotel.website),
      isOption: h.isOption,
    })),
    inclusions: list(row.inclusions),
    exclusions: list(row.exclusions),
    gallery: row.gallery.map((g) => toImage(g.media)).filter((i) => i !== undefined),
    visa: toVisaSummary(row.visaCountry ?? row.destination.country.visaGuides[0]),
    seo: toSeo(row.seo),
  };
}

/**
 * Related tours, scored: same destination (or same parent) 3, each shared
 * travel style 2, similar length (±2 days) 1, featured 1. Ties keep the
 * listing order. Never includes the current package.
 */
export async function findRelatedPackages(
  pkg: Pick<TourPackageDetail, "id" | "destinationRef" | "destinationAncestors" | "categoryRefs" | "durationDays">,
  limit = 3,
) {
  const topDestination = pkg.destinationAncestors[0]?.href ?? pkg.destinationRef.href;
  const categorySlugs = new Set(pkg.categoryRefs.map((c) => c.slug));

  const candidates = await db.tourPackage.findMany({
    where: { ...visiblePackage, id: { not: pkg.id } },
    orderBy: listOrder,
    take: 40,
    select: {
      ...summarySelect,
      isFeatured: true,
      destination: {
        select: { ...summarySelect.destination.select, parent: { select: { slug: true, scope: true } } },
      },
    },
  });

  const score = (c: (typeof candidates)[number]) => {
    const cTop = c.destination.parent
      ? routes.destination(c.destination.parent.scope, c.destination.parent.slug)
      : routes.destination(c.destination.scope, c.destination.slug);
    let s = cTop === topDestination ? 3 : 0;
    s += c.categories.filter((cat) => categorySlugs.has(cat.slug)).length * 2;
    if (Math.abs(c.durationDays - pkg.durationDays) <= 2) s += 1;
    if (c.isFeatured) s += 1;
    return s;
  };

  const ranked = candidates
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
  const rows = await db.tourPackage.findMany({
    where: { ...visiblePackage, isFeatured: true, featuredImageId: { not: null } },
    orderBy: listOrder,
    take: 6,
    select: {
      name: true,
      slug: true,
      isSample: true,
      featuredImage: { select: mediaSelect },
      destination: { select: { slug: true, scope: true } },
      itineraryDays: {
        orderBy: { dayNumber: "asc" },
        take: 4,
        select: {
          dayNumber: true,
          title: true,
          description: true,
          morningActivities: true,
          destination: { select: { name: true } },
          image: { select: mediaSelect },
        },
      },
    },
  });

  const best = rows
    .filter((r) => r.itineraryDays.length >= 3)
    .sort((a, b) => b.itineraryDays.filter((d) => d.image).length - a.itineraryDays.filter((d) => d.image).length)[0];
  const fallback = toImage(best?.featuredImage);
  if (!best || !fallback) return null;

  return {
    tourName: best.name,
    href: routes.tour(best.destination.scope, best.destination.slug, best.slug),
    isSample: best.isSample,
    days: best.itineraryDays.map((d) => ({
      dayNumber: d.dayNumber,
      title: d.title,
      location: opt(d.destination?.name),
      description: d.description ?? d.morningActivities ?? "",
      image: toImage(d.image) ?? fallback,
    })),
  };
}

// ---------------------------------------------------------------------------
// Tour categories (travel styles)
// ---------------------------------------------------------------------------

const categorySelect = {
  name: true,
  slug: true,
  description: true,
  image: { select: mediaSelect },
} satisfies Prisma.TourCategorySelect;

/** All published travel styles (homepage Travel Finder, related categories). */
export async function findTourCategories() {
  const rows = await db.tourCategory.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: categorySelect,
  });
  return rows.map((c) => ({
    id: c.slug,
    name: c.name,
    description: c.description ?? "",
    href: routes.tourCategory(c.slug),
    image: toImage(c.image),
  }));
}

export async function findTourCategoryBySlug(slug: string): Promise<TourCategoryDetail | null> {
  const row = await db.tourCategory.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { ...categorySelect, seo: { select: seoSelect } },
  });
  if (!row) return null;
  return {
    name: row.name,
    slug: row.slug,
    href: routes.tourCategory(row.slug),
    description: opt(row.description),
    image: toImage(row.image),
    seo: toSeo(row.seo),
  };
}

export async function findTourCategorySlugs() {
  const rows = await db.tourCategory.findMany({ where: { status: "PUBLISHED" }, select: { slug: true } });
  return rows.map((r) => r.slug);
}
