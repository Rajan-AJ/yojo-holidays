import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ImageAsset, SeoView } from "@/types/content";

/**
 * Helpers shared by every repository.
 *
 * Repositories are the only place that talks to Prisma for public content.
 * They return plain, serialisable view models (no Decimal, no Prisma types),
 * so results can be cached with "use cache" and passed to any component.
 */

/**
 * Sample (development) records are visible in development and hidden in
 * production unless SHOW_SAMPLE_CONTENT=true (e.g. on a staging deployment).
 */
export const includeSamples =
  process.env.NODE_ENV !== "production" || process.env.SHOW_SAMPLE_CONTENT === "true";

/**
 * `where` fragment for content the public may see: published, and not sample
 * data when samples are hidden. For models that have an `isSample` column.
 */
export const visible = {
  status: "PUBLISHED" as const,
  ...(includeSamples ? {} : { isSample: false }),
};

/** A package is public only if it and its destination are both public. */
export const visiblePackage = {
  ...visible,
  destination: { status: "PUBLISHED" as const, ...(includeSamples ? {} : { isSample: false }) },
} satisfies Prisma.TourPackageWhereInput;

/** null -> undefined, so view models use optional fields consistently. */
export function opt<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

export function toNumber(value: Prisma.Decimal | null | undefined): number | null {
  return value == null ? null : value.toNumber();
}

export function toIso(date: Date | null | undefined): string | undefined {
  return date ? date.toISOString() : undefined;
}

/** Fields selected from Media wherever an image is shown. */
export const mediaSelect = {
  url: true,
  altText: true,
  width: true,
  height: true,
  credit: true,
} satisfies Prisma.MediaSelect;

type MediaRow = Prisma.MediaGetPayload<{ select: typeof mediaSelect }>;

export function toImage(media: MediaRow | null | undefined): ImageAsset | undefined {
  if (!media) return undefined;
  return {
    src: media.url,
    alt: media.altText,
    width: opt(media.width),
    height: opt(media.height),
    credit: opt(media.credit),
  };
}

export const seoSelect = {
  seoTitle: true,
  metaDescription: true,
  canonicalUrl: true,
  ogTitle: true,
  ogDescription: true,
  noIndex: true,
  ogImage: { select: mediaSelect },
} satisfies Prisma.SeoMetaSelect;

type SeoRow = Prisma.SeoMetaGetPayload<{ select: typeof seoSelect }>;

export function toSeo(seo: SeoRow | null | undefined): SeoView {
  if (!seo) return { noIndex: false };
  return {
    title: opt(seo.seoTitle),
    description: opt(seo.metaDescription),
    canonicalUrl: opt(seo.canonicalUrl),
    ogTitle: opt(seo.ogTitle),
    ogDescription: opt(seo.ogDescription),
    ogImage: toImage(seo.ogImage),
    noIndex: seo.noIndex,
  };
}

/** Published FAQs, in display order. */
export const faqSelect = {
  where: visible,
  orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  select: { id: true, question: true, answer: true, isSample: true },
} satisfies Prisma.FAQFindManyArgs;
