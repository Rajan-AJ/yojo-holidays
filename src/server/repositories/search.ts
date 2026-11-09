import "server-only";
import { db } from "@/lib/db";
import type { DestinationSummary, TourSummary } from "@/types/content";
import { routes } from "@/lib/routes";
import { mediaSelect, opt, toImage, toNumber, visible, visiblePackage } from "./shared";

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 80;

/** Trim, collapse spaces and cap length. Returns null when too short to search. */
export function normaliseQuery(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const q = raw.replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX_LENGTH);
  return q.length >= SEARCH_MIN_LENGTH ? q : null;
}

/**
 * Simple site search over countries, destinations and tour packages:
 * case-insensitive "contains" on names, on the country/destination a result
 * belongs to ("Vietnam" also finds Hanoi and Vietnam tours) and on the places
 * a tour's itinerary visits.
 *
 * Fine for hundreds of rows. If content grows into the thousands, add a
 * pg_trgm GIN index or Postgres full-text search behind this same function.
 */
export async function searchContent(q: string, limit = 12) {
  const contains = { contains: q, mode: "insensitive" as const };

  const [destinationRows, packageRows] = await Promise.all([
    db.destination.findMany({
      where: { ...visible, OR: [{ name: contains }, { country: { name: contains } }] },
      orderBy: [{ parentId: { sort: "asc", nulls: "first" } }, { name: "asc" }],
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        scope: true,
        shortDescription: true,
        isSample: true,
        featuredImage: { select: mediaSelect },
        country: { select: { name: true, region: { select: { name: true } } } },
      },
    }),
    db.tourPackage.findMany({
      where: {
        ...visiblePackage,
        OR: [
          { name: contains },
          { destination: { name: contains } },
          { destination: { country: { name: contains } } },
          // Places the itinerary visits: "Tokyo" finds a Japan tour that stops there.
          { itineraryDays: { some: { destination: { name: contains } } } },
        ],
      },
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
      take: limit,
      select: {
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
        categories: { where: { status: "PUBLISHED" }, select: { name: true } },
      },
    }),
  ]);

  const destinations: DestinationSummary[] = destinationRows.flatMap((d) => {
    const image = toImage(d.featuredImage);
    if (!image) return [];
    return [
      {
        id: d.id,
        name: d.name,
        region: d.type === "COUNTRY" ? d.country.region.name : d.country.name,
        tagline: opt(d.shortDescription),
        scope: d.scope,
        href: routes.destination(d.scope, d.slug),
        image,
        isSample: d.isSample,
      },
    ];
  });

  const tours: TourSummary[] = packageRows.flatMap((p) => {
    const image = toImage(p.featuredImage);
    if (!image) return [];
    return [
      {
        id: p.id,
        name: p.name,
        href: routes.tour(p.destination.scope, p.destination.slug, p.slug),
        destination: p.destination.name,
        durationDays: p.durationDays,
        durationNights: p.durationNights,
        summary: opt(p.shortDescription),
        categories: p.categories.map((c) => c.name),
        price: { amount: toNumber(p.startingPrice), currency: p.currency, note: opt(p.priceNote) },
        image,
        isSample: p.isSample,
      },
    ];
  });

  return { destinations, tours };
}

/** Names offered as suggestions in the hero search box. */
export async function findSearchSuggestions(limit = 30) {
  const rows = await db.destination.findMany({
    where: visible,
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
    take: limit,
    select: { name: true },
  });
  return rows.map((r) => r.name);
}
