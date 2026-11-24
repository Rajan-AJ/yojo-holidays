import "server-only";
import type { FaqItem, ImageAsset, SeoView, TourScope } from "@/types/content";
import { mediaUrl } from "@/lib/media";

/**
 * Helpers shared by every repository.
 *
 * Repositories are the only place that talks to the database for public
 * content. They return plain, serialisable view models, so results can be
 * cached with "use cache" and passed to any component.
 *
 * SQL fragments built here contain only constant text and table aliases from
 * our own code; values always go through $n parameters.
 */

/**
 * Sample (development) records are visible in development and hidden in
 * production unless SHOW_SAMPLE_CONTENT=true (e.g. on a staging deployment).
 */
export const includeSamples =
  process.env.NODE_ENV !== "production" || process.env.SHOW_SAMPLE_CONTENT === "true";

/** Publicly visible row (mirrors public.is_live() used by RLS). */
export const live = (alias: string) =>
  `(${alias}.status = 'published' and ${alias}.published_at <= now() and ${alias}.deleted_at is null` +
  (includeSamples ? ")" : ` and not ${alias}.is_sample)`);

/** Same, for tables without is_sample (policies). */
export const liveNoSample = (alias: string) =>
  `(${alias}.status = 'published' and ${alias}.published_at <= now() and ${alias}.deleted_at is null)`;

/** null -> undefined, so view models use optional fields consistently. */
export function opt<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

export function toIso(date: Date | string | null | undefined): string | undefined {
  if (!date) return undefined;
  return typeof date === "string" ? new Date(date).toISOString() : date.toISOString();
}

export const toScope = (scope: string): TourScope => (scope === "domestic" ? "DOMESTIC" : "INTERNATIONAL");
export const fromScope = (scope: TourScope) => (scope === "DOMESTIC" ? "domestic" : "international");

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

/** JSON for one media_assets row, or null. */
export const mediaJson = (idExpr: string) => `(
  select json_build_object('bucket', m.bucket, 'path', m.storage_path, 'alt', m.alt_text,
                           'width', m.width, 'height', m.height, 'credit', m.credit)
  from public.media_assets m where m.id = ${idExpr} and m.deleted_at is null)`;

export type MediaRow = {
  bucket: string;
  path: string;
  alt: string;
  width: number | null;
  height: number | null;
  credit: string | null;
} | null;

export function toImage(media: MediaRow | undefined): ImageAsset | undefined {
  if (!media) return undefined;
  return {
    src: mediaUrl(media.bucket, media.path),
    alt: media.alt,
    width: opt(media.width),
    height: opt(media.height),
    credit: opt(media.credit),
  };
}

/** Ordered gallery for an entity's media join table. */
export const galleryJson = (table: "package_media" | "destination_media", fk: string, idExpr: string) => `(
  select coalesce(json_agg(${mediaJson("g.media_id")} order by g.sort_order), '[]'::json)
  from public.${table} g where g.${fk} = ${idExpr} and g.role = 'gallery')`;

export const toGallery = (rows: MediaRow[] | null | undefined) =>
  (rows ?? []).map(toImage).filter((i): i is ImageAsset => i !== undefined);

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

export const seoJson = (idExpr: string) => `(
  select json_build_object('title', s.seo_title, 'description', s.meta_description,
                           'canonical', s.canonical_path, 'ogTitle', s.og_title,
                           'ogDescription', s.og_description, 'ogImage', ${mediaJson("s.og_media_id")},
                           'noindex', s.noindex)
  from public.seo_meta s where s.id = ${idExpr})`;

type SeoRow = {
  title: string | null;
  description: string | null;
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: MediaRow;
  noindex: boolean;
} | null;

export function toSeo(seo: SeoRow | undefined): SeoView {
  if (!seo) return { noIndex: false };
  return {
    title: opt(seo.title),
    description: opt(seo.description),
    canonicalUrl: opt(seo.canonical),
    ogTitle: opt(seo.ogTitle),
    ogDescription: opt(seo.ogDescription),
    ogImage: toImage(seo.ogImage),
    noIndex: seo.noindex,
  };
}

// ---------------------------------------------------------------------------
// FAQs (written once in `faqs`, placed through `faq_links`)
// ---------------------------------------------------------------------------

export type FaqOwner =
  | "package_id"
  | "destination_id"
  | "country_id"
  | "visa_guide_id"
  | "blog_post_id"
  | "page_id"
  | "category_id";

export const faqsJson = (owner: FaqOwner, idExpr: string) => `(
  select coalesce(json_agg(json_build_object('id', f.id, 'question', f.question, 'answer', f.answer,
                                             'isSample', f.is_sample)
                           order by l.sort_order, f.created_at), '[]'::json)
  from public.faq_links l join public.faqs f on f.id = l.faq_id
  where l.${owner} = ${idExpr} and ${live("f")})`;

export const toFaqs = (rows: FaqItem[] | null | undefined): FaqItem[] => rows ?? [];
