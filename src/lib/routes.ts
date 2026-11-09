import type { GuideCategory, TourScope } from "@/types/content";

/**
 * Single source of truth for public URLs (all with trailing slashes, see
 * next.config.ts). Components never build paths by hand, so entity pages stay
 * consistently linked: destination -> tours -> visa -> guides.
 */
const scopeSegment: Record<TourScope, string> = {
  DOMESTIC: "domestic-tours",
  INTERNATIONAL: "international-tours",
};

export const guideCategorySlug: Record<GuideCategory, string> = {
  DESTINATION_GUIDE: "destination-guides",
  VISA_GUIDE: "visa-guides",
  TRAVEL_TIPS: "travel-tips",
  THINGS_TO_DO: "things-to-do",
  BEST_TIME_TO_VISIT: "best-time-to-visit",
  TRAVEL_COST_GUIDE: "travel-costs",
  TRAVEL_FAQ: "travel-faqs",
};

/** Travel-style pages live at the top level: /family-tours/, /honeymoon-tours/. */
export const CATEGORY_SUFFIX = "-tours";

export const routes = {
  home: () => "/",
  tours: () => "/tours/",
  tourCategory: (slug: string) => `/${slug}${CATEGORY_SUFFIX}/`,
  scope: (scope: TourScope) => `/${scopeSegment[scope]}/`,
  destinations: () => "/destinations/",
  destination: (scope: TourScope, slug: string) => `/${scopeSegment[scope]}/${slug}/`,
  tour: (scope: TourScope, destinationSlug: string, slug: string) =>
    `/${scopeSegment[scope]}/${destinationSlug}/${slug}/`,
  visa: () => "/visa/",
  visaCountry: (slug: string) => `/visa/${slug}/`,
  visaType: (countrySlug: string, typeSlug: string) => `/visa/${countrySlug}/${typeSlug}/`,
  /** Visa Finder; optional answers pre-fill it (or show the result when complete). */
  visaFinder: (answers?: { passport?: string; destination?: string; purpose?: string }) => {
    const query = new URLSearchParams(
      Object.entries(answers ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1])),
    ).toString();
    return query ? `/visa/finder/?${query}` : "/visa/finder/";
  },
  journal: () => "/travel-journal/",
  journalCategory: (category: GuideCategory) => `/travel-journal/category/${guideCategorySlug[category]}/`,
  article: (slug: string) => `/travel-journal/${slug}/`,
  about: () => "/about/",
  contact: () => "/contact/",
  faq: () => "/faq/",
  search: (q?: string) => (q ? `/search/?q=${encodeURIComponent(q)}` : "/search/"),
  /** Optional context so the trip form can be pre-filled (Phase 10). */
  planTrip: (context?: { destination?: string; package?: string; visa?: string }) => {
    const query = new URLSearchParams(
      Object.entries(context ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1])),
    ).toString();
    return query ? `/plan-your-trip/?${query}` : "/plan-your-trip/";
  },
} as const;
