import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ArticleSummary, GuideCategory, TravelGuideDetail } from "@/types/content";
import { routes } from "@/lib/routes";
import { defaultVisaGuide, toVisaSummary } from "./visa-summary";
import { faqSelect, mediaSelect, opt, seoSelect, toImage, toIso, toSeo, visible } from "./shared";

const listOrder = { publishedAt: "desc" } satisfies Prisma.TravelGuideOrderByWithRelationInput;

const summarySelect = {
  id: true,
  title: true,
  slug: true,
  category: true,
  excerpt: true,
  publishedAt: true,
  isSample: true,
  featuredImage: { select: mediaSelect },
} satisfies Prisma.TravelGuideSelect;

type SummaryRow = Prisma.TravelGuideGetPayload<{ select: typeof summarySelect }>;

function summaryFields(row: SummaryRow) {
  return {
    id: row.id,
    title: row.title,
    href: routes.article(row.slug),
    category: row.category,
    excerpt: opt(row.excerpt),
    publishedAt: toIso(row.publishedAt),
    isSample: row.isSample,
  };
}

function toSummaries(rows: SummaryRow[]): ArticleSummary[] {
  return rows.flatMap((row) => {
    const image = toImage(row.featuredImage);
    return image ? [{ ...summaryFields(row), image }] : [];
  });
}

export async function findLatestGuides({
  limit = 4,
  category,
  destinationSlug,
  countrySlug,
}: { limit?: number; category?: GuideCategory; destinationSlug?: string; countrySlug?: string } = {}) {
  const rows = await db.travelGuide.findMany({
    where: {
      ...visible,
      ...(category && { category }),
      // A destination's guides include those about places inside it.
      ...(destinationSlug && {
        destination: { OR: [{ slug: destinationSlug }, { parent: { slug: destinationSlug } }] },
      }),
      // A country's guides: about the country itself or any destination in it.
      ...(countrySlug && {
        OR: [{ country: { slug: countrySlug } }, { destination: { country: { slug: countrySlug } } }],
      }),
    },
    orderBy: listOrder,
    take: limit,
    select: summarySelect,
  });
  return toSummaries(rows);
}

export async function findGuideBySlug(slug: string): Promise<TravelGuideDetail | null> {
  const row = await db.travelGuide.findFirst({
    where: { ...visible, slug },
    select: {
      ...summarySelect,
      content: true,
      updatedAt: true,
      author: { select: { name: true, bio: true } },
      destination: { select: { name: true, slug: true, scope: true, status: true } },
      country: { select: { name: true, slug: true, visaGuides: defaultVisaGuide } },
      faqs: faqSelect,
      related: { where: visible, orderBy: listOrder, take: 3, select: summarySelect },
      seo: { select: seoSelect },
    },
  });
  if (!row) return null;

  const destination =
    row.destination?.status === "PUBLISHED"
      ? { name: row.destination.name, href: routes.destination(row.destination.scope, row.destination.slug) }
      : undefined;
  // Country-level guides (e.g. visa guides) link to the country's visa page.
  const country =
    row.country && toVisaSummary(row.country.visaGuides[0])
      ? { name: row.country.name, href: routes.visaCountry(row.country.slug) }
      : undefined;

  return {
    ...summaryFields(row),
    slug: row.slug,
    image: toImage(row.featuredImage),
    content: row.content,
    updatedAt: row.updatedAt.toISOString(),
    author: row.author ? { name: row.author.name, bio: opt(row.author.bio) } : undefined,
    destination,
    country,
    faqs: row.faqs,
    related: toSummaries(row.related),
    seo: toSeo(row.seo),
  };
}
