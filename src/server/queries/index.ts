import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { TourFilters, TourPackageDetail, TourScope, VisaPurpose } from "@/types/content";
import { visaConfig } from "@/config/site";
import * as destinations from "@/server/repositories/destinations";
import * as packages from "@/server/repositories/packages";
import * as visa from "@/server/repositories/visa";
import * as blog from "@/server/repositories/blog";
import * as engagement from "@/server/repositories/engagement";
import * as search from "@/server/repositories/search";
import * as settings from "@/server/repositories/settings";
import * as pages from "@/server/repositories/pages";
import { tags } from "./cache-tags";

/**
 * The functions pages and components call for public content.
 *
 * CACHING STRATEGY
 * - Every function is a "use cache" wrapper around a repository function, so
 *   results are shared across requests and pages are prerendered at build.
 * - cacheLife("hours") bounds staleness; the admin calls revalidateTag() on
 *   save/publish so edits appear immediately (src/server/admin/revalidate.ts).
 * - Search depends on free text, so it is cached briefly ("minutes").
 *
 * Keep these thin: data shaping lives in the repositories.
 */

// ---- Site -------------------------------------------------------------------

export async function getSiteSettings() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.settings);
  return settings.findSiteSettings();
}

export async function getCmsPage(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.pages, tags.faqs);
  return pages.findPageBySlug(slug);
}

export async function getCmsPageSlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.pages);
  return pages.findCmsPageSlugs();
}

// ---- Geography --------------------------------------------------------------

export async function getRegionsWithCountries() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.countries, tags.destinations);
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

export async function getDestinationBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.destinations, tags.destination(slug), tags.visa);
  return destinations.findDestinationBySlug(slug);
}

export async function getDestinationSlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.destinations);
  return destinations.findDestinationSlugs();
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
  cacheTag(tags.blog, tags.destination(destinationSlug));
  return blog.findLatestPosts({ destinationSlug, limit });
}

export async function getDestinationFAQs(destinationSlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.faqs, tags.destination(destinationSlug));
  return destinations.findFaqsForDestination(destinationSlug);
}

// ---- Tour packages ----------------------------------------------------------

export async function getFeaturedPackages(limit?: number, filters?: TourFilters) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages);
  return packages.findFeaturedPackages(limit, filters);
}

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
  cacheTag(tags.packages, tags.categories);
  return packages.findPackages({ category: categorySlug });
}

/** The whole package page in one query (itinerary, hotels, prices, gallery, visa). */
export async function getTourPackageBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages, tags.package(slug), tags.visa);
  return packages.findPackageBySlug(slug);
}

export async function getPackageSlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages);
  return packages.findPackageSlugs();
}

export async function getRelatedPackages(
  pkg: Pick<TourPackageDetail, "id" | "topDestinationSlug" | "categoryRefs" | "durationDays">,
) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages);
  return packages.findRelatedPackages(pkg);
}

export async function getPackageFAQs(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.faqs, tags.package(slug));
  return packages.findFaqsForPackage(slug);
}

export async function getPackageReviews(packageId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.reviews);
  return engagement.findPublishedReviews({ packageId, limit: 6 });
}

export async function getRatingSummary(packageId?: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.reviews);
  return engagement.findRatingSummary(packageId);
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
  cacheTag(tags.categories, tags.packages);
  return packages.findTourCategories();
}

export async function getTourCategoryBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.categories, tags.packages);
  return packages.findTourCategoryBySlug(slug);
}

export async function getTourCategorySlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.categories);
  return packages.findTourCategorySlugs();
}

// ---- Visa -------------------------------------------------------------------

export async function getVisaPassports() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.visa);
  return visa.findVisaPassports();
}

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

export async function getVisaCountryBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.visa, tags.visaCountry(slug));
  return visa.findVisaCountryBySlug(slug);
}

export async function getVisaTypeBySlug(guideSlug: string, typeSlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.visa, tags.visaCountry(guideSlug));
  return visa.findVisaTypeBySlug(guideSlug, typeSlug);
}

export async function findVisaMatch(passportIso: string, countrySlug: string, purpose: VisaPurpose) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.visa);
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

export async function getCountryPackages(countrySlug: string, limit = 3) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.packages);
  return (await packages.findPackages({ country: countrySlug })).slice(0, limit);
}

export async function getCountryGuides(countrySlug: string, limit = 3) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.blog);
  return blog.findLatestPosts({ countrySlug, limit });
}

export async function getCountryDestinations(countrySlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.destinations);
  return destinations.findDestinationsByCountry(countrySlug);
}

// ---- Blog -------------------------------------------------------------------

export async function getLatestGuides(options?: {
  limit?: number;
  category?: string;
  destinationSlug?: string;
  countrySlug?: string;
  tag?: string;
  before?: { publishedAt: string; id: string };
}) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.blog);
  return blog.findLatestPosts(options);
}

export async function getTravelGuideBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.blog, tags.post(slug));
  return blog.findPostBySlug(slug);
}

export async function getBlogCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.blog);
  return blog.findBlogCategories();
}

export async function getBlogCategoryBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.blog);
  return blog.findBlogCategoryBySlug(slug);
}

export async function getPostSlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.blog);
  return blog.findPostSlugs();
}

export async function getBlogCategorySlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.blog);
  return blog.findBlogCategorySlugs();
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
