import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { GuideCategory, TourFilters, TourPackageDetail, TourScope, VisaPurpose } from "@/types/content";
import { visaConfig } from "@/config/site";
import * as destinations from "@/server/repositories/destinations";
import * as packages from "@/server/repositories/packages";
import * as visa from "@/server/repositories/visa";
import * as guides from "@/server/repositories/guides";
import * as engagement from "@/server/repositories/engagement";
import * as search from "@/server/repositories/search";
import { tags } from "./cache-tags";

/**
 * The functions pages and components call for public content.
 *
 * CACHING STRATEGY
 * - Every function is a "use cache" wrapper around a repository function, so
 *   results are shared across requests and pages are prerendered at build.
 * - cacheLife("hours"): cached results are refreshed in the background at
 *   most about an hour after they go stale. Until the admin (Phase 11) calls
 *   revalidateTag() on save, this bounds how long an edit takes to appear.
 * - cacheTag(): each result is tagged by entity (see cache-tags.ts) so the
 *   admin can purge exactly what changed, immediately.
 * - Search results depend on free text, so they are cached briefly
 *   ("minutes") to avoid filling the cache with one-off queries.
 *
 * Keep these thin: data shaping lives in the repositories, which are also
 * used and tested outside Next (scripts/verify-data.ts).
 */

// ---- Geography --------------------------------------------------------------

export async function getRegionsWithCountries() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.countries);
  return destinations.findRegionsWithCountries();
}

export async function getCountryBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.countries, tags.country(slug), tags.destinations);
  return destinations.findCountryBySlug(slug);
}

// ---- Destinations -----------------------------------------------------------

export async function getFeaturedDestinations(limit?: number) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.destinations, tags.packages);
  return destinations.findFeaturedDestinations(limit);
}

export async function getTopLevelDestinations(scope?: TourScope) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.destinations, tags.packages);
  return destinations.findTopLevelDestinations(scope);
}

/** Includes country, region, places inside it, related destinations and visa summary. */
export async function getDestinationBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.destinations, tags.destination(slug), tags.visa);
  return destinations.findDestinationBySlug(slug);
}

export async function getDestinationSlugs(scope: TourScope) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.destinations);
  return destinations.findDestinationSlugs(scope);
}

export async function getDestinationScope(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.destinations, tags.destination(slug));
  return destinations.findDestinationScope(slug);
}

export async function getDestinationPackages(destinationSlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages, tags.destination(destinationSlug));
  return packages.findPackages({ destination: destinationSlug });
}

export async function getDestinationGuides(destinationSlug: string, limit = 3) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.guides, tags.destination(destinationSlug));
  return guides.findLatestGuides({ destinationSlug, limit });
}

export async function getDestinationFAQs(destinationSlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.faqs, tags.destination(destinationSlug));
  return engagement.findFaqsForDestination(destinationSlug);
}

// ---- Tour packages ----------------------------------------------------------

export async function getFeaturedPackages(limit?: number, filters?: TourFilters) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages);
  return packages.findFeaturedPackages(limit, filters);
}

/** Listing with filters (destination, duration, category, price). */
export async function getPackages(filters: TourFilters) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages);
  return packages.findPackages(filters);
}

export async function getListingFacets(base: Pick<TourFilters, "scope" | "category">) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages);
  return packages.findListingFacets(base);
}

export async function getPackagesByCategory(categorySlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages);
  return packages.findPackages({ category: categorySlug });
}

/**
 * The whole package page in one query: itinerary, hotels, highlights,
 * inclusions/exclusions, gallery and visa summary come back together
 * (no request waterfall), so there are no separate itinerary/hotel calls.
 */
export async function getTourPackageBySlug(destinationSlug: string, packageSlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages, tags.package(destinationSlug, packageSlug), tags.visa);
  return packages.findPackageBySlug(destinationSlug, packageSlug);
}

export async function getPackageParams(scope: TourScope) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages);
  return packages.findPackageParams(scope);
}

export async function getPackageScope(destinationSlug: string, packageSlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages, tags.package(destinationSlug, packageSlug));
  return packages.findPackageScope(destinationSlug, packageSlug);
}

export async function getRelatedPackages(
  pkg: Pick<TourPackageDetail, "id" | "destinationRef" | "destinationAncestors" | "categoryRefs" | "durationDays">,
) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages);
  return packages.findRelatedPackages(pkg);
}

export async function getPackageFAQs(destinationSlug: string, packageSlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.faqs, tags.package(destinationSlug, packageSlug));
  return engagement.findFaqsForPackage(destinationSlug, packageSlug);
}

export async function getPackageReviews(packageId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.reviews);
  return engagement.findPublishedReviews({ packageId, limit: 6 });
}

export async function getShowcaseItinerary() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages);
  return packages.findShowcaseItinerary();
}

// ---- Travel styles ----------------------------------------------------------

export async function getTourCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages);
  return packages.findTourCategories();
}

export async function getTourCategoryBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages);
  return packages.findTourCategoryBySlug(slug);
}

export async function getTourCategorySlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages);
  return packages.findTourCategorySlugs();
}

// ---- Visa -------------------------------------------------------------------

export async function getVisaPassports() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.visa);
  return visa.findVisaPassports();
}

/** All published guides (all passports unless one is given). */
export async function getVisaGuides(passportIso?: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.visa);
  return visa.findVisaGuides(passportIso);
}

/** Destinations offered in visa forms: the default passport's guides. */
export async function getVisaDestinations() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.visa);
  const guides = await visa.findVisaGuides(visaConfig.defaultPassportIso);
  return guides.map((g) => ({ slug: g.countrySlug, name: g.countryName }));
}

export async function getVisaCountryBySlug(countrySlug: string, passportIso?: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.visa, tags.visaCountry(countrySlug));
  return visa.findVisaCountryBySlug(countrySlug, passportIso);
}

export async function getVisaTypeBySlug(countrySlug: string, typeSlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.visa, tags.visaCountry(countrySlug));
  return visa.findVisaTypeBySlug(countrySlug, typeSlug);
}

export async function findVisaMatch(passportIso: string, countrySlug: string, purpose: VisaPurpose) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.visa, tags.visaCountry(countrySlug));
  return visa.findVisaMatch(passportIso, countrySlug, purpose);
}

export async function getVisaParams() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.visa);
  return visa.findVisaParams();
}

export async function getCommonVisaDocuments() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.visa);
  return visa.findCommonVisaDocuments();
}

export async function getVisaFAQs() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.faqs, tags.visa);
  return visa.findGeneralVisaFaqs();
}

/** Related content for a country's visa page. */
export async function getCountryPackages(countrySlug: string, limit = 3) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages);
  return (await packages.findPackages({ country: countrySlug })).slice(0, limit);
}

export async function getCountryGuides(countrySlug: string, limit = 3) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.guides);
  return guides.findLatestGuides({ countrySlug, limit });
}

export async function getCountryDestinations(countrySlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.destinations);
  return destinations.findDestinationsByCountry(countrySlug);
}

// ---- Travel Journal ---------------------------------------------------------

export async function getLatestGuides(options?: {
  limit?: number;
  category?: GuideCategory;
  destinationSlug?: string;
  countrySlug?: string;
}) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.guides);
  return guides.findLatestGuides(options);
}

export async function getTravelGuideBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.guides, tags.guide(slug));
  return guides.findGuideBySlug(slug);
}

// ---- FAQs and reviews -------------------------------------------------------

export async function getHomepageFaqs(limit?: number) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.faqs);
  return engagement.findHomepageFaqs(limit);
}

export async function getGeneralFaqs() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.faqs);
  return engagement.findGeneralFaqs();
}

export async function getPublishedReviews(options?: { limit?: number; destinationSlug?: string }) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.reviews);
  return engagement.findPublishedReviews(options);
}

// ---- Search -----------------------------------------------------------------

export async function searchSite(q: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(tags.destinations, tags.packages);
  return search.searchContent(q);
}

export async function getSearchSuggestions() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.destinations);
  return search.findSearchSuggestions();
}
