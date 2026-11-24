import type { TourScope } from "@/types/content";

/**
 * Single source of truth for public URLs (all with trailing slashes, see
 * next.config.ts). Components never build paths by hand.
 *
 * KEEP IN SYNC with public.content_path() in
 * supabase/migrations/20261124000300_triggers.sql, which creates automatic 301
 * redirects when a published slug changes.
 *
 * Slugs are globally unique per content type, so URLs are flat and stable:
 * moving a package to another destination never changes its URL.
 */
const scopeSegment: Record<TourScope, string> = {
  DOMESTIC: "domestic-tours",
  INTERNATIONAL: "international-tours",
};

const withQuery = (path: string, params?: Record<string, string | undefined>) => {
  const query = new URLSearchParams(
    Object.entries(params ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();
  return query ? `${path}?${query}` : path;
};

export const routes = {
  home: () => "/",

  // Tours
  tours: () => "/tours/",
  scope: (scope: TourScope) => `/${scopeSegment[scope]}/`,
  tourCategory: (slug: string) => `/tours/${slug}/`,
  tour: (slug: string) => `/packages/${slug}/`,

  // Destinations
  destinations: () => "/destinations/",
  destination: (slug: string) => `/destinations/${slug}/`,

  // Visa
  visa: () => "/visa/",
  visaCountry: (slug: string) => `/visa/${slug}/`,
  visaType: (guideSlug: string, typeSlug: string) => `/visa/${guideSlug}/${typeSlug}/`,
  /** Visa Finder; optional answers pre-fill it (or show the result when complete). */
  visaFinder: (answers?: { passport?: string; destination?: string; purpose?: string }) =>
    withQuery("/visa/finder/", answers),

  // Blog
  journal: () => "/blog/",
  blogCategory: (slug: string) => `/blog/category/${slug}/`,
  article: (slug: string) => `/blog/${slug}/`,
  author: (slug: string) => `/authors/${slug}/`,

  // Company
  about: () => "/about/",
  contact: () => "/contact/",
  faq: () => "/faq/",
  privacy: () => "/privacy-policy/",
  terms: () => "/terms/",
  search: (q?: string) => (q ? `/search/?q=${encodeURIComponent(q)}` : "/search/"),
  /** Optional context so the enquiry form is pre-filled. */
  planTrip: (context?: { destination?: string; package?: string; visa?: string }) =>
    withQuery("/plan-your-trip/", context),
  thankYou: (ref?: string) => withQuery("/thank-you/", { ref }),
} as const;
