import "server-only";
import { db } from "@/lib/db";
import type { FaqItem, ReviewView } from "@/types/content";
import type { Prisma } from "@/generated/prisma/client";
import { faqSelect, mediaSelect, toImage, visible } from "./shared";

// ---------------------------------------------------------------------------
// FAQs (one table, attached to at most one owner)
// ---------------------------------------------------------------------------

/** FAQs for a package, found by its public URL parts. */
export async function findFaqsForPackage(destinationSlug: string, packageSlug: string): Promise<FaqItem[]> {
  return db.fAQ.findMany({
    ...faqSelect,
    where: {
      ...faqSelect.where,
      package: { slug: packageSlug, destination: { slug: destinationSlug } },
    },
  });
}

export async function findFaqsForDestination(destinationSlug: string): Promise<FaqItem[]> {
  return db.fAQ.findMany({
    ...faqSelect,
    where: { ...faqSelect.where, destination: { slug: destinationSlug, status: "PUBLISHED" } },
  });
}

/** Homepage FAQs: site-wide entries flagged for the homepage. */
export async function findHomepageFaqs(limit = 6): Promise<FaqItem[]> {
  return db.fAQ.findMany({
    ...faqSelect,
    where: { ...faqSelect.where, placement: "HOMEPAGE" },
    take: limit,
  });
}

/** The /faq/ page: FAQs with no owner. */
export async function findGeneralFaqs(): Promise<FaqItem[]> {
  return db.fAQ.findMany({
    ...faqSelect,
    where: {
      ...faqSelect.where,
      packageId: null,
      destinationId: null,
      countryId: null,
      guideId: null,
      visaCountryId: null,
      visaTypeId: null,
    },
  });
}

// ---------------------------------------------------------------------------
// Reviews (real, staff-approved only)
// ---------------------------------------------------------------------------

const reviewSelect = {
  id: true,
  travellerName: true,
  rating: true,
  title: true,
  content: true,
  travelDate: true,
  isSample: true,
  verified: true,
  travellerImage: { select: mediaSelect },
  destination: { select: { name: true } },
  package: { select: { destination: { select: { name: true } } } },
} satisfies Prisma.ReviewSelect;

export async function findPublishedReviews({
  limit = 6,
  packageId,
  destinationSlug,
}: { limit?: number; packageId?: string; destinationSlug?: string } = {}): Promise<ReviewView[]> {
  const rows = await db.review.findMany({
    where: {
      ...visible,
      ...(packageId && { packageId }),
      ...(destinationSlug && { destination: { slug: destinationSlug } }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: reviewSelect,
  });

  return rows.map((r) => ({
    id: r.id,
    body: r.content,
    travellerName: r.travellerName,
    destination: r.destination?.name ?? r.package?.destination.name,
    travelYear: r.travelDate ? r.travelDate.getUTCFullYear() : undefined,
    rating: r.rating,
    title: r.title ?? undefined,
    verified: r.verified,
    image: toImage(r.travellerImage),
    isSample: r.isSample,
  }));
}
