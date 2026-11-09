import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type {
  PassportRef,
  VisaCountryDetail,
  VisaGuideSummary,
  VisaPurpose,
  VisaTypeView,
} from "@/types/content";
import { visaConfig } from "@/config/site";
import { routes } from "@/lib/routes";
import { faqSelect, mediaSelect, opt, seoSelect, toImage, toIso, toNumber, toSeo, visible } from "./shared";

/**
 * Visa guides: one per destination country + passport. All functions take a
 * passport ISO code and default to the site's audience (visaConfig).
 *
 * Honesty rules applied here, once, for every page that shows visa data:
 * - A guide is "verified" only with a lastVerifiedAt date and when it is not
 *   sample data. Fees and processing times are returned ONLY for verified
 *   guides; otherwise they are omitted and the UI tells people to ask the team.
 * - Nothing is derived or guessed: missing fields stay missing.
 */

const DEFAULT_PASSPORT: string = visaConfig.defaultPassportIso;

const guideWhere = (passportIso: string) =>
  ({ ...visible, passportCountry: { isoCode: passportIso.toUpperCase() } }) satisfies Prisma.VisaCountryWhereInput;

const publishedTypes = { status: "PUBLISHED" as const };

/** A visa type earns its own page only with enough real content to stand alone. */
function hasOwnPage(
  type: { requirements: unknown[]; steps: unknown[]; description: string | null; eligibility: string | null },
  typeCount: number,
) {
  return (
    typeCount >= 2 &&
    type.requirements.length >= 3 &&
    type.steps.length >= 3 &&
    Boolean(type.description || type.eligibility)
  );
}

// ---------------------------------------------------------------------------
// Lists (index page, Visa Finder options, static params)
// ---------------------------------------------------------------------------

/** Passports that have at least one published guide (Visa Finder step 1). */
export async function findVisaPassports(): Promise<PassportRef[]> {
  const rows = await db.country.findMany({
    where: { passportVisaGuides: { some: visible } },
    orderBy: { name: "asc" },
    select: { isoCode: true, name: true, demonym: true },
  });
  // The default passport first.
  return rows
    .map((r) => ({ isoCode: r.isoCode, name: r.name, demonym: opt(r.demonym) }))
    .sort((a, b) => Number(b.isoCode === DEFAULT_PASSPORT) - Number(a.isoCode === DEFAULT_PASSPORT));
}

/** Every published guide for all passports, with the purposes each one covers. */
export async function findVisaGuides(passportIso?: string): Promise<VisaGuideSummary[]> {
  const rows = await db.visaCountry.findMany({
    where: passportIso ? guideWhere(passportIso) : visible,
    orderBy: { country: { name: "asc" } },
    select: {
      shortAnswer: true,
      isSample: true,
      featuredImage: { select: mediaSelect },
      passportCountry: { select: { isoCode: true } },
      country: {
        select: {
          name: true,
          slug: true,
          // Fall back to the country's destination photo for the card.
          destinations: {
            where: { ...visible, type: "COUNTRY" },
            take: 1,
            select: { featuredImage: { select: mediaSelect } },
          },
        },
      },
      visaTypes: { where: publishedTypes, orderBy: { sortOrder: "asc" }, select: { name: true, purpose: true } },
    },
  });

  return rows.map((r) => ({
    countrySlug: r.country.slug,
    countryName: r.country.name,
    href: routes.visaCountry(r.country.slug),
    passportIso: r.passportCountry.isoCode,
    shortAnswer: opt(r.shortAnswer),
    image: toImage(r.featuredImage) ?? toImage(r.country.destinations[0]?.featuredImage),
    purposes: [...new Set(r.visaTypes.map((t) => t.purpose))],
    typeNames: r.visaTypes.map((t) => t.name),
    isSample: r.isSample,
  }));
}

/** Static params for /visa/[country]/ and /visa/[country]/[visaType]/ (default passport). */
export async function findVisaParams() {
  const guides = await db.visaCountry.findMany({
    where: guideWhere(DEFAULT_PASSPORT),
    select: {
      country: { select: { slug: true } },
      visaTypes: {
        where: publishedTypes,
        select: {
          slug: true,
          description: true,
          eligibility: true,
          requirements: { select: { id: true } },
          steps: { select: { id: true } },
        },
      },
    },
  });
  return {
    countries: guides.map((g) => g.country.slug),
    types: guides.flatMap((g) =>
      g.visaTypes
        .filter((t) => hasOwnPage(t, g.visaTypes.length))
        .map((t) => ({ country: g.country.slug, visaType: t.slug })),
    ),
  };
}

/**
 * The documents that come up most across published visa types, for the
 * "documents overview" on /visa/. Purely counted from the data.
 */
export async function findCommonVisaDocuments(passportIso = DEFAULT_PASSPORT, limit = 6) {
  const rows = await db.visaRequirement.groupBy({
    by: ["title"],
    where: { required: true, visaType: { ...publishedTypes, visaCountry: guideWhere(passportIso) } },
    _count: { title: true },
    orderBy: { _count: { title: "desc" } },
    take: limit,
  });
  return rows.map((r) => ({ title: r.title, guides: r._count.title }));
}

/** General visa questions for /visa/ (FAQ placement VISA, no owner). */
export async function findGeneralVisaFaqs() {
  return db.fAQ.findMany({ ...faqSelect, where: { ...faqSelect.where, placement: "VISA" } });
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

const typeSelect = {
  name: true,
  slug: true,
  purpose: true,
  kind: true,
  description: true,
  eligibility: true,
  processingTime: true,
  validity: true,
  maxStay: true,
  entries: true,
  fee: true,
  currency: true,
  feeNotes: true,
  importantNotes: true,
  requirements: { orderBy: { sortOrder: "asc" }, select: { title: true, description: true, required: true } },
  steps: { orderBy: { sortOrder: "asc" }, select: { title: true, description: true } },
  faqs: faqSelect,
} satisfies Prisma.VisaTypeSelect;

const guideSelect = {
  shortAnswer: true,
  description: true,
  importantNotes: true,
  lastVerifiedAt: true,
  sourceUrl: true,
  isSample: true,
  featuredImage: { select: mediaSelect },
  passportCountry: { select: { isoCode: true, name: true, demonym: true } },
  country: {
    select: {
      name: true,
      slug: true,
      isoCode: true,
      destinations: {
        where: { ...visible, type: "COUNTRY" },
        take: 1,
        select: { name: true, slug: true, scope: true, featuredImage: { select: mediaSelect } },
      },
    },
  },
  faqs: faqSelect,
  seo: { select: seoSelect },
  visaTypes: { where: publishedTypes, orderBy: { sortOrder: "asc" }, select: typeSelect },
} satisfies Prisma.VisaCountrySelect;

type GuideRow = Prisma.VisaCountryGetPayload<{ select: typeof guideSelect }>;
type TypeRow = GuideRow["visaTypes"][number];

const list = (items: { title: string; description: string | null }[]) =>
  items.map((i) => ({ title: i.title, description: opt(i.description) }));

function toTypeView(t: TypeRow, countrySlug: string, verified: boolean, typeCount: number): VisaTypeView {
  const ownPage = hasOwnPage(t, typeCount);
  return {
    name: t.name,
    slug: t.slug,
    purpose: t.purpose,
    kind: t.kind,
    description: opt(t.description),
    eligibility: opt(t.eligibility),
    processingTime: verified ? opt(t.processingTime) : undefined,
    validity: opt(t.validity),
    maxStay: opt(t.maxStay),
    entries: opt(t.entries),
    fee: { amount: verified ? toNumber(t.fee) : null, currency: t.currency ?? "INR" },
    feeNotes: verified ? opt(t.feeNotes) : undefined,
    importantNotes: opt(t.importantNotes),
    requirements: t.requirements.map((r) => ({ title: r.title, description: opt(r.description), required: r.required })),
    steps: list(t.steps),
    faqs: t.faqs,
    hasOwnPage: ownPage,
    href: ownPage ? routes.visaType(countrySlug, t.slug) : `${routes.visaCountry(countrySlug)}#${t.slug}`,
  };
}

function toDetail(row: GuideRow): VisaCountryDetail {
  const verified = Boolean(row.lastVerifiedAt) && !row.isSample;
  const destination = row.country.destinations[0];
  return {
    country: {
      name: row.country.name,
      slug: row.country.slug,
      isoCode: row.country.isoCode,
      href: routes.visaCountry(row.country.slug),
    },
    passport: {
      isoCode: row.passportCountry.isoCode,
      name: row.passportCountry.name,
      demonym: opt(row.passportCountry.demonym),
    },
    shortAnswer: opt(row.shortAnswer),
    description: opt(row.description),
    importantNotes: opt(row.importantNotes),
    image: toImage(row.featuredImage) ?? toImage(destination?.featuredImage),
    verified,
    lastVerifiedAt: toIso(row.lastVerifiedAt),
    sourceUrl: opt(row.sourceUrl),
    isSample: row.isSample,
    faqs: row.faqs,
    seo: toSeo(row.seo),
    destination: destination
      ? { name: destination.name, href: routes.destination(destination.scope, destination.slug) }
      : undefined,
    visaTypes: row.visaTypes.map((t) => toTypeView(t, row.country.slug, verified, row.visaTypes.length)),
  };
}

/** Everything for /visa/{countrySlug}/ for a passport (default: the site's audience). */
export async function findVisaCountryBySlug(
  countrySlug: string,
  passportIso = DEFAULT_PASSPORT,
): Promise<VisaCountryDetail | null> {
  const row = await db.visaCountry.findFirst({
    where: { ...guideWhere(passportIso), country: { slug: countrySlug } },
    select: guideSelect,
  });
  return row ? toDetail(row) : null;
}

/**
 * A visa type that has its own page, with its guide. Returns null for unknown
 * types AND for types too thin to stand alone (they live on the country page).
 */
export async function findVisaTypeBySlug(countrySlug: string, typeSlug: string, passportIso = DEFAULT_PASSPORT) {
  const guide = await findVisaCountryBySlug(countrySlug, passportIso);
  const type = guide?.visaTypes.find((t) => t.slug === typeSlug);
  if (!guide || !type || !type.hasOwnPage) return null;
  return { guide, type };
}

export type VisaMatch =
  | { status: "match"; guide: VisaCountryDetail; type: VisaTypeView }
  | { status: "no-type"; guide: VisaCountryDetail }
  | { status: "no-guide" };

/**
 * Visa Finder: passport + destination + purpose -> the matching visa type.
 * Inputs come from the URL, so they are validated against the database here;
 * anything unknown simply yields "no-guide".
 */
export async function findVisaMatch(passportIso: string, countrySlug: string, purpose: VisaPurpose): Promise<VisaMatch> {
  const guide = await findVisaCountryBySlug(countrySlug, passportIso);
  if (!guide) return { status: "no-guide" };
  const type = guide.visaTypes.find((t) => t.purpose === purpose);
  return type ? { status: "match", guide, type } : { status: "no-type", guide };
}

/** Lightweight existence checks for src/proxy.ts (real 404s). */
export async function visaGuideExists(countrySlug: string) {
  const row = await db.visaCountry.findFirst({
    where: { ...guideWhere(DEFAULT_PASSPORT), country: { slug: countrySlug } },
    select: { id: true },
  });
  return Boolean(row);
}

export async function visaTypePageExists(countrySlug: string, typeSlug: string) {
  return Boolean(await findVisaTypeBySlug(countrySlug, typeSlug));
}
