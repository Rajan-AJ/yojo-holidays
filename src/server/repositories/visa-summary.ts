import "server-only";
import type { VisaSummary } from "@/types/content";
import { visaConfig } from "@/config/site";
import { routes } from "@/lib/routes";
import { live, opt } from "./shared";

/**
 * The short visa block used on destination and package pages. It never states
 * more than the visa record holds: type names, processing time (only when the
 * guide is verified) and the first few document titles, plus a link to the
 * full visa page.
 */

export const DEFAULT_PASSPORT = visaConfig.defaultPassportIso;
if (!/^[A-Z]{2}$/.test(DEFAULT_PASSPORT)) throw new Error("visaConfig.defaultPassportIso must be an ISO 3166-1 alpha-2 code");

/** "3–5 days", "5 days", or the free-text note. */
export function formatProcessing(min: number | null, max: number | null, note: string | null) {
  if (min != null && max != null && max !== min) return `${min}–${max} days`;
  const days = max ?? min;
  if (days != null) return `${days} ${days === 1 ? "day" : "days"}`;
  return opt(note);
}

/** JSON for the default-passport guide of the country given by `countryIdExpr`. */
export const visaSummaryJson = (countryIdExpr: string) => `(
  select json_build_object(
    'slug', g.slug, 'isSample', g.is_sample, 'shortAnswer', g.summary,
    'verified', g.last_verified_at is not null and not g.is_sample,
    'countryName', dc.name, 'demonym', pc.demonym,
    'types', (
      select coalesce(json_agg(json_build_object(
        'name', t.name, 'min', t.processing_days_min, 'max', t.processing_days_max, 'note', t.processing_note,
        'requirements', (
          select coalesce(json_agg(x.title order by x.sort_order), '[]'::json)
          from (select title, sort_order from public.visa_documents
                where visa_type_id = t.id order by sort_order limit 4) x)
      ) order by t.sort_order), '[]'::json)
      from (select * from public.visa_types
            where visa_guide_id = g.id and status = 'published' order by sort_order limit 3) t))
  from public.visa_guides g
  join public.countries dc on dc.id = g.destination_country_id
  join public.countries pc on pc.id = g.passport_country_id
  where g.destination_country_id = ${countryIdExpr} and pc.iso2 = '${DEFAULT_PASSPORT}' and ${live("g")}
  limit 1)`;

export type VisaSummaryRow = {
  slug: string;
  isSample: boolean;
  shortAnswer: string | null;
  verified: boolean;
  countryName: string;
  demonym: string | null;
  types: { name: string; min: number | null; max: number | null; note: string | null; requirements: string[] }[];
} | null;

export function toVisaSummary(row: VisaSummaryRow | undefined): VisaSummary | undefined {
  if (!row) return undefined;
  return {
    countryName: row.countryName,
    passportLabel: opt(row.demonym),
    href: routes.visaCountry(row.slug),
    shortAnswer: opt(row.shortAnswer),
    isSample: row.isSample,
    types: row.types.map((t) => ({
      name: t.name,
      processingTime: row.verified ? formatProcessing(t.min, t.max, t.note) : undefined,
      requirements: t.requirements,
    })),
  };
}
