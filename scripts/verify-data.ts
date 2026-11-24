/**
 * Data-flow verification: calls every public repository function against the
 * database in DATABASE_URL and checks the results make sense.
 *
 *   npm run db:local            (in another terminal)
 *   npm run db:verify
 *
 * Run with --conditions=react-server so `server-only` imports resolve.
 */
import * as destinations from "@/server/repositories/destinations";
import * as packages from "@/server/repositories/packages";
import * as visa from "@/server/repositories/visa";
import * as blog from "@/server/repositories/blog";
import * as engagement from "@/server/repositories/engagement";
import * as search from "@/server/repositories/search";
import * as settings from "@/server/repositories/settings";
import { findActiveRedirects } from "@/server/repositories/redirects";
import { createLead } from "@/server/services/leads";
import { pool } from "@/lib/db";

let failures = 0;
async function check(label: string, run: () => Promise<unknown>, ok: (v: never) => boolean = () => true) {
  try {
    const value = await run();
    const pass = ok(value as never);
    if (!pass) failures++;
    const size = Array.isArray(value) ? `${value.length} rows` : value === null ? "null" : typeof value;
    console.log(pass ? "✔" : "✘", label, `(${size})`);
    return value;
  } catch (error) {
    failures++;
    console.log("✘", label, "->", (error as Error).message);
    return undefined;
  }
}

const nonEmpty = (v: unknown[]) => v.length > 0;
const present = (v: unknown) => v !== null && v !== undefined;

async function main() {
  // Destinations
  await check("featured destinations", () => destinations.findFeaturedDestinations(), nonEmpty);
  await check("top-level destinations (international)", () => destinations.findTopLevelDestinations("INTERNATIONAL"), nonEmpty);
  await check("top-level destinations (domestic)", () => destinations.findTopLevelDestinations("DOMESTIC"), nonEmpty);
  const vietnam = (await check("destination: vietnam", () => destinations.findDestinationBySlug("vietnam"), present)) as Awaited<
    ReturnType<typeof destinations.findDestinationBySlug>
  >;
  if (vietnam) {
    console.log(`   places=${vietnam.places.length} tours=${vietnam.tourCount} tips=${vietnam.travelTips.length} visa=${Boolean(vietnam.visa)} seo=${vietnam.seo.title}`);
  }
  await check("destination: unknown -> null", () => destinations.findDestinationBySlug("atlantis"), (v) => v === null);
  await check("destination FAQs (vietnam)", () => destinations.findFaqsForDestination("vietnam"), nonEmpty);
  await check("destinations by country (VN)", () => destinations.findDestinationsByCountry("vietnam"), nonEmpty);
  await check("regions with countries", () => destinations.findRegionsWithCountries(), nonEmpty);
  await check("destination slugs", () => destinations.findDestinationSlugs(), nonEmpty);

  // Packages
  await check("featured packages", () => packages.findFeaturedPackages(), nonEmpty);
  await check("packages: international", () => packages.findPackages({ scope: "INTERNATIONAL" }), nonEmpty);
  await check("packages: domestic", () => packages.findPackages({ scope: "DOMESTIC" }), nonEmpty);
  await check("packages: destination hanoi (via package_destinations)", () => packages.findPackages({ destination: "hanoi" }), nonEmpty);
  await check("packages: category honeymoon", () => packages.findPackages({ category: "honeymoon" }), nonEmpty);
  await check("packages: country vietnam", () => packages.findPackages({ country: "vietnam" }), nonEmpty);
  await check("packages: duration week", () => packages.findPackages({ duration: "week" }), nonEmpty);
  await check("listing facets", () => packages.findListingFacets({ scope: "INTERNATIONAL" }), (v: { total: number }) => v.total > 0);
  const pkg = (await check("package: vietnam-7-days-6-nights", () => packages.findPackageBySlug("vietnam-7-days-6-nights"), present)) as Awaited<
    ReturnType<typeof packages.findPackageBySlug>
  >;
  if (pkg) {
    console.log(
      `   days=${pkg.itinerary.length} activities(day2)=${pkg.itinerary[1]?.activities.length} hotels=${pkg.hotels.length} ` +
        `incl=${pkg.inclusions.length} excl=${pkg.exclusions.length} types=${pkg.includedTypes.join("|")} ` +
        `gallery=${pkg.gallery.length} policies=${pkg.policies.length} visa=${Boolean(pkg.visa)} cats=${pkg.categoryRefs.length}`,
    );
    await check("related packages", () => packages.findRelatedPackages(pkg), nonEmpty);
  }
  await check("package FAQs (shared FAQ)", () => packages.findFaqsForPackage("kerala-5-days-4-nights"), nonEmpty);
  await check("package: unknown -> null", () => packages.findPackageBySlug("nope"), (v) => v === null);
  await check("package exists", () => packages.packageExists("japan-5-days-4-nights"), (v) => v === true);
  await check("showcase itinerary", () => packages.findShowcaseItinerary(), present);
  await check("tour categories", () => packages.findTourCategories(), (v: unknown[]) => v.length === 7);
  await check("tour category: family", () => packages.findTourCategoryBySlug("family"), present);

  // Visa
  await check("visa passports", () => visa.findVisaPassports(), nonEmpty);
  await check("visa guides (IN)", () => visa.findVisaGuides("IN"), nonEmpty);
  await check("visa guide: japan", () => visa.findVisaCountryBySlug("japan"), present);
  await check("visa type page: japan/tourist-visa", () => visa.findVisaTypeBySlug("japan", "tourist-visa"), present);
  await check("visa type page: vietnam/tourist-visa is too thin -> null", () => visa.findVisaTypeBySlug("vietnam", "tourist-visa"), (v) => v === null);
  await check("visa match", () => visa.findVisaMatch("IN", "japan", "BUSINESS"), (v: { status: string }) => v.status === "match");
  await check("visa params", () => visa.findVisaParams(), (v: { countries: string[] }) => v.countries.length > 0);
  await check("common visa documents", () => visa.findCommonVisaDocuments(), nonEmpty);
  await check("general visa FAQs", () => visa.findGeneralVisaFaqs(), nonEmpty);

  // Blog
  await check("latest posts", () => blog.findLatestPosts(), nonEmpty);
  await check("posts in category", () => blog.findLatestPosts({ category: "visa-guides" }), nonEmpty);
  await check("posts by tag", () => blog.findLatestPosts({ tag: "vietnam" }), nonEmpty);
  await check("posts for destination", () => blog.findLatestPosts({ destinationSlug: "vietnam" }), nonEmpty);
  await check("post detail", () => blog.findPostBySlug("best-time-to-visit-vietnam"), (v: { relatedTours: unknown[]; faqs: unknown[] }) =>
    v.relatedTours.length > 0 && v.faqs.length > 0,
  );
  await check("blog categories", () => blog.findBlogCategories(), nonEmpty);

  // Engagement, search, settings, redirects
  await check("homepage FAQs", () => engagement.findHomepageFaqs(), nonEmpty);
  await check("general FAQs", () => engagement.findGeneralFaqs(), nonEmpty);
  await check("testimonials (none seeded)", () => engagement.findPublishedReviews(), (v: unknown[]) => v.length === 0);
  await check("search: 'tokyo' finds the Japan tour", () => search.searchContent("tokyo"), (v: { tours: unknown[] }) => v.tours.length > 0);
  await check("search: 'backwaters' (full text)", () => search.searchContent("backwaters"), (v: { destinations: unknown[] }) => v.destinations.length > 0);
  await check("search suggestions", () => search.findSearchSuggestions(), nonEmpty);
  await check("site settings", () => settings.findSiteSettings(), present);
  await check("redirects", () => findActiveRedirects(), () => true);

  // Write path: a lead with attribution, then the same again (double submit)
  const form = {
    name: "Verify Script",
    phone: "98765 00001",
    email: "verify@example.com",
    packageSlug: "vietnam-7-days-6-nights",
    adults: "2",
    budget: "1l-2l",
    formPath: "/packages/vietnam-7-days-6-nights/",
    attribution: JSON.stringify({
      first: { utm_source: "google", utm_medium: "cpc", utm_campaign: "vietnam-q4", gclid: "abc123", landing_path: "/" },
      last: { referrer: "https://www.instagram.com/", landing_path: "/packages/vietnam-7-days-6-nights/" },
    }),
  };
  const first = (await check("createLead", () => createLead(form, { userAgent: "Mozilla/5.0 (iPhone)" }), (v: { ok: boolean }) => v.ok)) as
    | { ok: true; reference: string }
    | undefined;
  await check("createLead (double submit -> same reference)", () => createLead(form), (v: { ok: boolean; reference?: string }) =>
    v.ok && v.reference === first?.reference,
  );
  await check("createLead rejects a bad phone", () => createLead({ ...form, phone: "12" }), (v: { ok: boolean }) => !v.ok);
  const touch = await pool.query(
    `select t.touch, c.code from public.lead_touchpoints t join public.marketing_channels c on c.id = t.channel_id
      join public.leads l on l.id = t.lead_id where l.lead_number = $1 order by t.touch`,
    [Number(first?.reference.slice(3))],
  );
  const channels = touch.rows.map((r) => `${r.touch}:${r.code}`).join(",");
  console.log(channels === "first:google-ads,last:instagram" ? "✔" : "✘", "attribution channels", channels);
  if (channels !== "first:google-ads,last:instagram") failures++;

  console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL CHECKS PASSED");
  await pool.end();
  process.exit(failures ? 1 : 0);
}

main();
