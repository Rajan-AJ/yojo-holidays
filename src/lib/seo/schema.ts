import { siteConfig } from "@/config/site";
import type {
  DestinationDetail,
  FaqItem,
  ReviewView,
  TourPackageDetail,
} from "@/types/content";

/**
 * Structured data builders (schema.org, JSON-LD).
 *
 * Rules:
 * - Only facts that are in the data. Nothing is inferred or padded.
 * - Sample (development) content never gets entity schema: builders return null.
 * - No Offer without a real price, no AggregateRating without real reviews,
 *   no availability claims at all.
 * Render the result with <JsonLd> from ./json-ld.
 */

export type JsonLdObject = { "@context"?: string; "@type": string | string[]; [key: string]: unknown };

export const absoluteUrl = (path: string) => new URL(path, siteConfig.url).toString();

/** The company entity. Other schema references it by @id (GEO entity linking). */
export const organizationId = `${siteConfig.url}/#organization`;

export function organizationSchema(): JsonLdObject {
  return {
    "@type": "Organization",
    "@id": organizationId,
    name: siteConfig.name,
    url: absoluteUrl("/"),
    logo: absoluteUrl(siteConfig.logo),
    description: siteConfig.description,
    slogan: siteConfig.tagline,
    // contactPoint / address / sameAs are added once real values replace the
    // [CLIENT ...] placeholders in src/config/site.ts.
  };
}

export function breadcrumbSchema(items: { name: string; href: string }[]): JsonLdObject {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
}

/** Only for real, published FAQs that are visible on the page. */
export function faqSchema(items: FaqItem[]): JsonLdObject | null {
  if (items.length === 0 || items.some((i) => i.isSample)) return null;
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function touristDestinationSchema(d: DestinationDetail): JsonLdObject | null {
  if (d.isSample) return null;
  return {
    "@type": "TouristDestination",
    name: d.name,
    url: absoluteUrl(d.href),
    ...(d.tagline && { description: d.tagline }),
    ...(d.image && { image: absoluteUrl(d.image.src) }),
    ...(d.type !== "COUNTRY" && { containedInPlace: { "@type": "Country", name: d.country.name } }),
  };
}

/** Real (non-sample) reviews with a rating. */
function realRatings(reviews: ReviewView[]) {
  return reviews.filter((r) => !r.isSample && r.rating !== null).map((r) => r.rating as number);
}

/**
 * A tour package as a TouristTrip (always accurate: name, itinerary places,
 * provider) plus, only when real data supports it, a Product with an Offer
 * (real starting price) and/or AggregateRating (real published reviews).
 */
export function tourSchemas(pkg: TourPackageDetail, reviews: ReviewView[]): JsonLdObject[] {
  if (pkg.isSample) return [];
  const url = absoluteUrl(pkg.href);
  const image = pkg.image ? absoluteUrl(pkg.image.src) : undefined;
  const places = [...new Set(pkg.itinerary.map((d) => d.location).filter(Boolean))];

  const trip: JsonLdObject = {
    "@type": "TouristTrip",
    name: pkg.name,
    url,
    ...(pkg.summary && { description: pkg.summary }),
    ...(image && { image }),
    provider: { "@id": organizationId },
    ...(places.length > 0 && {
      itinerary: {
        "@type": "ItemList",
        itemListElement: places.map((name, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: { "@type": "Place", name },
        })),
      },
    }),
  };

  const ratings = realRatings(reviews);
  const hasPrice = pkg.price.amount !== null;
  if (!hasPrice && ratings.length === 0) return [trip];

  const product: JsonLdObject = {
    "@type": "Product",
    name: pkg.name,
    url,
    ...(pkg.summary && { description: pkg.summary }),
    ...(image && { image }),
    brand: { "@id": organizationId },
    ...(hasPrice && {
      offers: {
        "@type": "Offer",
        price: pkg.price.amount,
        priceCurrency: pkg.price.currency,
        url,
      },
    }),
    ...(ratings.length > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)),
        reviewCount: ratings.length,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
  return [trip, product];
}

/**
 * Visa assistance as a Service offered by the company. Describes the service
 * only (no fees, durations or outcomes). For a country guide, pass the
 * country; never emitted for sample guides.
 */
export function visaServiceSchema({
  name,
  path,
  description,
  country,
}: {
  name: string;
  path: string;
  description?: string;
  country?: string;
}): JsonLdObject {
  return {
    "@type": "Service",
    name,
    serviceType: "Visa assistance",
    url: absoluteUrl(path),
    provider: { "@id": organizationId },
    ...(description && { description }),
    ...(country && { areaServed: { "@type": "Country", name: country } }),
  };
}
