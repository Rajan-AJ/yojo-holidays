import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { VisaSummary } from "@/types/content";
import { visaConfig } from "@/config/site";
import { routes } from "@/lib/routes";
import { includeSamples, opt, visible } from "./shared";

/**
 * The short visa block used on destination and package pages. It never states
 * more than the visa record holds: type names, processing time (only when the
 * guide is verified) and the first few requirement titles, plus a link to the
 * full visa page.
 */
export const visaSummarySelect = {
  status: true,
  isSample: true,
  shortAnswer: true,
  lastVerifiedAt: true,
  country: { select: { name: true, slug: true } },
  passportCountry: { select: { demonym: true, isoCode: true } },
  visaTypes: {
    where: { status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    take: 3,
    select: {
      name: true,
      processingTime: true,
      requirements: { orderBy: { sortOrder: "asc" }, take: 4, select: { title: true } },
    },
  },
} satisfies Prisma.VisaCountrySelect;

/** Relation filter: a country's published guide for the site's default passport. */
export const defaultVisaGuide = {
  where: { ...visible, passportCountry: { isoCode: visaConfig.defaultPassportIso } },
  take: 1,
  select: visaSummarySelect,
} satisfies Prisma.Country$visaGuidesArgs;

type VisaRow = Prisma.VisaCountryGetPayload<{ select: typeof visaSummarySelect }>;

export function toVisaSummary(row: VisaRow | null | undefined): VisaSummary | undefined {
  if (!row || row.status !== "PUBLISHED") return undefined;
  if (row.isSample && !includeSamples) return undefined;
  // Only the default passport's guide has the public /visa/{country}/ URL.
  if (row.passportCountry.isoCode !== visaConfig.defaultPassportIso) return undefined;
  const verified = Boolean(row.lastVerifiedAt) && !row.isSample;
  return {
    countryName: row.country.name,
    passportLabel: opt(row.passportCountry.demonym),
    href: routes.visaCountry(row.country.slug),
    shortAnswer: opt(row.shortAnswer),
    isSample: row.isSample,
    types: row.visaTypes.map((t) => ({
      name: t.name,
      processingTime: verified ? opt(t.processingTime) : undefined,
      requirements: t.requirements.map((r) => r.title),
    })),
  };
}
