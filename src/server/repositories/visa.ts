import "server-only";
import { query, queryOne } from "@/lib/db";
import type {
  FaqItem,
  PassportRef,
  VisaCountryDetail,
  VisaGuideSummary,
  VisaKind,
  VisaPurpose,
  VisaTypeView,
} from "@/types/content";
import { routes } from "@/lib/routes";
import { nonEmptyDoc, type RichTextDoc } from "@/lib/rich-text";
import { faqsJson, live, mediaJson, opt, seoJson, toImage, toIso, toSeo, type MediaRow } from "./shared";
import { DEFAULT_PASSPORT, formatProcessing } from "./visa-summary";

/**
 * Visa guides: one per destination country + passport.
 *
 * Honesty rules applied here, once, for every page that shows visa data:
 * - A guide is "verified" only with a last_verified_at date and when it is not
 *   sample data. Fees and processing times are returned ONLY for verified
 *   guides; otherwise they are omitted and the UI tells people to ask the team.
 * - Nothing is derived or guessed: missing fields stay missing.
 */

const toPurpose = (p: string) => p.toUpperCase() as VisaPurpose;
const fromPurpose = (p: VisaPurpose) => p.toLowerCase();

const GUIDE_FROM = `
  from public.visa_guides g
  join public.countries dc on dc.id = g.destination_country_id
  join public.countries pc on pc.id = g.passport_country_id
  where ${live("g")}`;

/** A visa type earns its own page only with enough real content to stand alone. */
function hasOwnPage(t: { documents: unknown[]; steps: unknown[]; description: string | null; eligibility: string | null }, typeCount: number) {
  return typeCount >= 2 && t.documents.length >= 3 && t.steps.length >= 3 && Boolean(t.description || t.eligibility);
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

/** Passports that have at least one published guide (Visa Finder step 1). */
export async function findVisaPassports(): Promise<PassportRef[]> {
  const rows = await query<{ iso2: string; name: string; demonym: string | null }>(
    `select distinct pc.iso2, pc.name, pc.demonym ${GUIDE_FROM} order by pc.name`,
  );
  return rows
    .map((r) => ({ isoCode: r.iso2, name: r.name, demonym: opt(r.demonym) }))
    .sort((a, b) => Number(b.isoCode === DEFAULT_PASSPORT) - Number(a.isoCode === DEFAULT_PASSPORT));
}

export async function findVisaGuides(passportIso?: string): Promise<VisaGuideSummary[]> {
  const params: unknown[] = [];
  let where = "";
  if (passportIso) {
    params.push(passportIso.toUpperCase());
    where = " and pc.iso2 = $1";
  }
  const rows = await query<{
    slug: string;
    country_slug: string;
    country_name: string;
    passport_iso: string;
    summary: string | null;
    is_sample: boolean;
    image: MediaRow;
    fallback_image: MediaRow;
    types: { name: string; purpose: string }[];
  }>(
    `select g.slug, dc.slug as country_slug, dc.name as country_name, pc.iso2 as passport_iso, g.summary, g.is_sample,
            ${mediaJson("g.hero_media_id")} as image,
            (select ${mediaJson("d.hero_media_id")} from public.destinations d
              where d.country_id = dc.id and d.type = 'country' and ${live("d")} limit 1) as fallback_image,
            (select coalesce(json_agg(json_build_object('name', t.name, 'purpose', t.purpose) order by t.sort_order), '[]'::json)
               from public.visa_types t where t.visa_guide_id = g.id and t.status = 'published') as types
       ${GUIDE_FROM} ${where} order by dc.name`,
    params,
  );
  return rows.map((r) => ({
    countrySlug: r.country_slug,
    countryName: r.country_name,
    href: routes.visaCountry(r.slug),
    passportIso: r.passport_iso,
    shortAnswer: opt(r.summary),
    image: toImage(r.image) ?? toImage(r.fallback_image),
    purposes: [...new Set(r.types.map((t) => toPurpose(t.purpose)))],
    typeNames: r.types.map((t) => t.name),
    isSample: r.is_sample,
  }));
}

/** Static params for /visa/[country]/ and /visa/[country]/[visaType]/ (default passport). */
export async function findVisaParams() {
  const guides = await findDefaultGuides();
  return {
    countries: guides.map((g) => g.country.slug),
    types: guides.flatMap((g) =>
      g.visaTypes.filter((t) => t.hasOwnPage).map((t) => ({ country: g.country.slug, visaType: t.slug })),
    ),
  };
}

async function findDefaultGuides() {
  const rows = await query<{ slug: string }>(`select g.slug ${GUIDE_FROM} and pc.iso2 = $1`, [DEFAULT_PASSPORT]);
  const guides = await Promise.all(rows.map((r) => findVisaCountryBySlug(r.slug)));
  return guides.filter((g): g is VisaCountryDetail => g !== null);
}

/** Documents that come up most across published visa types (counted from the data). */
export async function findCommonVisaDocuments(passportIso = DEFAULT_PASSPORT, limit = 6) {
  const rows = await query<{ title: string; guides: number }>(
    `select vd.title, count(*) as guides
       from public.visa_documents vd
       join public.visa_types t on t.id = vd.visa_type_id and t.status = 'published'
       join public.visa_guides g on g.id = t.visa_guide_id
       join public.countries pc on pc.id = g.passport_country_id
      where vd.is_mandatory and ${live("g")} and pc.iso2 = $1
      group by vd.title order by count(*) desc, vd.title limit $2`,
    [passportIso, limit],
  );
  return rows;
}

/** General visa questions for /visa/ (FAQs linked to the 'visa' page). */
export async function findGeneralVisaFaqs(): Promise<FaqItem[]> {
  const row = await queryOne<{ faqs: FaqItem[] }>(
    `select ${faqsJson("page_id", "pg.id")} as faqs from public.pages pg where pg.slug = 'visa' and ${live("pg")}`,
  );
  return row?.faqs ?? [];
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

type TypeRow = {
  name: string;
  slug: string;
  purpose: string;
  kind: string | null;
  description: string | null;
  eligibility: string | null;
  pmin: number | null;
  pmax: number | null;
  pnote: string | null;
  validity_days: number | null;
  max_stay_days: number | null;
  entries: string | null;
  fees: { label: string; kind: string; amount: number | null; currency: string | null; notes: string | null }[];
  documents: { title: string; description: string | null; mandatory: boolean; applies_to: string | null }[];
  steps: { title: string; description: string | null }[];
};

type GuideRow = {
  slug: string;
  summary: string | null;
  content: RichTextDoc | null;
  important_notes: string | null;
  last_verified_at: Date | null;
  source_url: string | null;
  is_sample: boolean;
  image: MediaRow;
  country_name: string;
  country_slug: string;
  country_iso: string;
  passport_iso: string;
  passport_name: string;
  passport_demonym: string | null;
  destination: { name: string; slug: string; image: MediaRow } | null;
  types: TypeRow[];
  faqs: FaqItem[];
  seo: Parameters<typeof toSeo>[0];
};

const GUIDE_COLUMNS = `
  g.slug, g.summary, g.content, g.important_notes, g.last_verified_at, g.source_url, g.is_sample,
  ${mediaJson("g.hero_media_id")} as image,
  dc.name as country_name, dc.slug as country_slug, dc.iso2 as country_iso,
  pc.iso2 as passport_iso, pc.name as passport_name, pc.demonym as passport_demonym,
  (select json_build_object('name', d.name, 'slug', d.slug, 'image', ${mediaJson("d.hero_media_id")})
     from public.destinations d where d.country_id = dc.id and d.type = 'country' and ${live("d")} limit 1) as destination,
  (select coalesce(json_agg(json_build_object(
      'name', t.name, 'slug', t.slug, 'purpose', t.purpose, 'kind', t.kind,
      'description', t.description, 'eligibility', t.eligibility,
      'pmin', t.processing_days_min, 'pmax', t.processing_days_max, 'pnote', t.processing_note,
      'validity_days', t.validity_days, 'max_stay_days', t.max_stay_days, 'entries', t.entries,
      'fees', (select coalesce(json_agg(json_build_object('label', f.label, 'kind', f.fee_kind, 'amount', f.amount,
                                                          'currency', f.currency, 'notes', f.notes) order by f.sort_order), '[]'::json)
                 from public.visa_fees f where f.visa_type_id = t.id),
      'documents', (select coalesce(json_agg(json_build_object('title', vd.title, 'description', vd.description,
                                                               'mandatory', vd.is_mandatory, 'applies_to', vd.applies_to) order by vd.sort_order), '[]'::json)
                      from public.visa_documents vd where vd.visa_type_id = t.id),
      'steps', (select coalesce(json_agg(json_build_object('title', s.title, 'description', s.description) order by s.sort_order), '[]'::json)
                  from public.visa_process_steps s where s.visa_type_id = t.id)
    ) order by t.sort_order), '[]'::json)
    from public.visa_types t where t.visa_guide_id = g.id and t.status = 'published') as types,
  ${faqsJson("visa_guide_id", "g.id")} as faqs,
  ${seoJson("g.seo_meta_id")} as seo`;

const days = (n: number | null) => (n == null ? undefined : `${n} ${n === 1 ? "day" : "days"}`);
const entriesLabel: Record<string, string> = { single: "Single entry", double: "Double entry", multiple: "Multiple entry" };

function toTypeView(t: TypeRow, guideSlug: string, verified: boolean, typeCount: number): VisaTypeView {
  const ownPage = hasOwnPage(t, typeCount);
  const govFee = t.fees.find((f) => f.kind === "government") ?? t.fees[0];
  const feeNotes = t.fees
    .filter((f) => f !== govFee || f.notes)
    .map((f) => (f === govFee ? f.notes : `${f.label}${f.amount != null ? `: ${f.currency ?? ""} ${f.amount}` : ""}${f.notes ? ` (${f.notes})` : ""}`))
    .filter(Boolean)
    .join(" · ");
  return {
    name: t.name,
    slug: t.slug,
    purpose: toPurpose(t.purpose),
    kind: t.kind ? (t.kind.toUpperCase() as VisaKind) : null,
    description: opt(t.description),
    eligibility: opt(t.eligibility),
    processingTime: verified ? formatProcessing(t.pmin, t.pmax, t.pnote) : undefined,
    validity: days(t.validity_days),
    maxStay: days(t.max_stay_days),
    entries: t.entries ? entriesLabel[t.entries] : undefined,
    fee: { amount: verified ? (govFee?.amount ?? null) : null, currency: govFee?.currency ?? "INR" },
    feeNotes: verified && feeNotes ? feeNotes : undefined,
    importantNotes: undefined,
    requirements: t.documents.map((d) => ({
      title: d.title,
      description: opt([d.applies_to, d.description].filter(Boolean).join(": ") || null),
      required: d.mandatory,
    })),
    steps: t.steps.map((s) => ({ title: s.title, description: opt(s.description) })),
    faqs: [],
    hasOwnPage: ownPage,
    href: ownPage ? routes.visaType(guideSlug, t.slug) : `${routes.visaCountry(guideSlug)}#${t.slug}`,
  };
}

function toDetail(row: GuideRow): VisaCountryDetail {
  const verified = Boolean(row.last_verified_at) && !row.is_sample;
  return {
    country: { name: row.country_name, slug: row.slug, isoCode: row.country_iso, href: routes.visaCountry(row.slug) },
    passport: { isoCode: row.passport_iso, name: row.passport_name, demonym: opt(row.passport_demonym) },
    shortAnswer: opt(row.summary),
    description: nonEmptyDoc(row.content),
    importantNotes: opt(row.important_notes),
    image: toImage(row.image) ?? toImage(row.destination?.image),
    verified,
    lastVerifiedAt: toIso(row.last_verified_at),
    sourceUrl: opt(row.source_url),
    isSample: row.is_sample,
    faqs: row.faqs,
    seo: toSeo(row.seo),
    destination: row.destination ? { name: row.destination.name, href: routes.destination(row.destination.slug) } : undefined,
    visaTypes: row.types.map((t) => toTypeView(t, row.slug, verified, row.types.length)),
  };
}

/** Everything for /visa/{slug}/ (guide slug). */
export async function findVisaCountryBySlug(slug: string): Promise<VisaCountryDetail | null> {
  const row = await queryOne<GuideRow>(`select ${GUIDE_COLUMNS} ${GUIDE_FROM} and g.slug = $1`, [slug]);
  return row ? toDetail(row) : null;
}

/** The guide for a destination country + passport (Visa Finder). */
async function findGuideForCountry(countrySlug: string, passportIso: string) {
  const row = await queryOne<GuideRow>(
    `select ${GUIDE_COLUMNS} ${GUIDE_FROM} and dc.slug = $1 and pc.iso2 = $2`,
    [countrySlug, passportIso.toUpperCase()],
  );
  return row ? toDetail(row) : null;
}

/** A visa type with its own page, with its guide. Null for unknown or too-thin types. */
export async function findVisaTypeBySlug(guideSlug: string, typeSlug: string) {
  const guide = await findVisaCountryBySlug(guideSlug);
  const type = guide?.visaTypes.find((t) => t.slug === typeSlug);
  if (!guide || !type || !type.hasOwnPage) return null;
  return { guide, type };
}

export type VisaMatch =
  | { status: "match"; guide: VisaCountryDetail; type: VisaTypeView }
  | { status: "no-type"; guide: VisaCountryDetail }
  | { status: "no-guide" };

/** Visa Finder: passport + destination country + purpose -> the matching visa type. */
export async function findVisaMatch(passportIso: string, countrySlug: string, purpose: VisaPurpose): Promise<VisaMatch> {
  const guide = await findGuideForCountry(countrySlug, passportIso);
  if (!guide) return { status: "no-guide" };
  const type = guide.visaTypes.find((t) => t.purpose === purpose);
  return type ? { status: "match", guide, type } : { status: "no-type", guide };
}

/** Lightweight existence checks for src/proxy.ts (real 404s). */
export async function visaGuideExists(slug: string) {
  return Boolean(await queryOne(`select 1 ${GUIDE_FROM} and g.slug = $1`, [slug]));
}

export async function visaTypePageExists(guideSlug: string, typeSlug: string) {
  return Boolean(await findVisaTypeBySlug(guideSlug, typeSlug));
}

export { fromPurpose };
