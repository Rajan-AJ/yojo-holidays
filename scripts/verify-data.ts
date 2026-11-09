/**
 * Data-flow verification for the content architecture (Phase 3).
 * Run with `npm run db:verify` after `npx prisma db seed`.
 *
 * Exercises the real repositories and write services against the database,
 * plus the CHECK / unique constraints. Every row it creates is removed again.
 */
import "dotenv/config"; // must load before @/lib/db reads DATABASE_URL
import { db } from "@/lib/db";
import { findCountryBySlug, findDestinationBySlug, findFeaturedDestinations } from "@/server/repositories/destinations";
import { findFeaturedPackages, findPackageBySlug, findPackages, findRelatedPackages } from "@/server/repositories/packages";
import {
  findCommonVisaDocuments,
  findGeneralVisaFaqs,
  findVisaCountryBySlug,
  findVisaGuides,
  findVisaMatch,
  findVisaPassports,
  findVisaTypeBySlug,
} from "@/server/repositories/visa";
import { findGuideBySlug, findLatestGuides } from "@/server/repositories/guides";
import { findFaqsForPackage, findHomepageFaqs, findPublishedReviews } from "@/server/repositories/engagement";
import { createEnquiry, createLead } from "@/server/services/leads";
import { slug as slugSchema, slugify } from "@/server/validation/common";

let failures = 0;
function check(name: string, ok: unknown, detail?: unknown) {
  if (ok) console.log(`  PASS  ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name}`, detail ?? "");
  }
}

/** Resolves true if the promise is rejected (used for constraint tests). */
async function rejects(promise: Promise<unknown>) {
  try {
    await promise;
    return false;
  } catch {
    return true;
  }
}

const cleanup: (() => Promise<unknown>)[] = [];

async function main() {
  console.log("Relationships");

  // 1-2. Region can be created; Country belongs to a Region
  const region = await db.region.create({ data: { name: "Verify Region", slug: "verify-region" } });
  cleanup.push(() => db.region.delete({ where: { id: region.id } }));
  check("1. Region can be created", region.id);
  const vn = await db.country.findUnique({ where: { slug: "vietnam" }, include: { region: { include: { parent: true } } } });
  check("2. Country belongs to a Region (Vietnam -> Southeast Asia -> Asia)", vn?.region.slug === "southeast-asia" && vn.region.parent?.slug === "asia");

  // 3. Destination belongs to a Country (and to a parent destination)
  const hanoi = await db.destination.findUnique({ where: { slug: "hanoi" }, include: { country: true, parent: true } });
  check("3. Destination belongs to a Country (Hanoi -> Vietnam)", hanoi?.country.slug === "vietnam" && hanoi.parent?.slug === "vietnam");

  // 4-7. Package -> Destination, days, highlights, hotels (via the repository)
  const pkg = await findPackageBySlug("vietnam", "vietnam-7-days-6-nights");
  check("4. Tour Package belongs to a Destination", pkg?.destinationRef.slug === "vietnam");
  check("5. Package has multiple itinerary days, ordered 1..n", pkg?.itinerary.length === 7 && pkg.itinerary.every((d, i) => d.dayNumber === i + 1));
  check("   Itinerary day resolves location + hotel", pkg?.itinerary[2].location === "Ha Long Bay" && pkg.itinerary[2].accommodation === "Sample Bay Cruise");
  check("6. Package has highlights", (pkg?.highlights.length ?? 0) === 3);
  check("7. Package has hotels with nights", pkg?.hotels.map((h) => h.nights).join(",") === "2,1,3");
  check("   Package price null -> 'price on request' (no invented price)", pkg?.price.amount === null);
  check("   Package categories (many-to-many)", pkg?.categoryRefs.map((c) => c.name).sort().join(",") === "Family,Group");
  check("   Package links to its visa page", pkg?.visa?.href === "/visa/vietnam/");
  check("   Related tours exclude the current package", pkg ? (await findRelatedPackages(pkg)).every((t) => !t.href.endsWith("vietnam-7-days-6-nights/")) && (await findRelatedPackages(pkg)).length >= 1 : false);
  check("   Filters: destination + duration", (await findPackages({ destination: "vietnam", duration: "week" })).length === 1 && (await findPackages({ destination: "vietnam", duration: "long" })).length === 0);
  const dupDay = await rejects(
    db.itineraryDay.create({ data: { packageId: (await db.tourPackage.findFirstOrThrow({ where: { slug: "vietnam-7-days-6-nights" } })).id, dayNumber: 1, title: "Duplicate" } }),
  );
  check("   dayNumber is unique within a package", dupDay);

  // 8-9. Visa (guides are per destination + passport)
  const visa = await findVisaCountryBySlug("vietnam");
  check("8. Visa information belongs to a Country (for the Indian passport)", visa?.country.slug === "vietnam" && visa.passport.isoCode === "IN" && visa.passport.demonym === "Indian");
  check("9. Visa Type belongs to visa info, with documents, steps + FAQs", visa?.visaTypes[0]?.requirements.length === 3 && visa.visaTypes[0].steps.length === 3 && visa.visaTypes[0].faqs.length === 1);
  check("   Unverified guide: fee and processing time withheld", visa?.verified === false && visa.visaTypes[0].fee.amount === null && visa.visaTypes[0].processingTime === undefined);
  check("   Unverified guide: visa kind not guessed", visa?.visaTypes[0].kind === null);
  check("   Guide links to the country's destination page", visa?.destination?.href === "/international-tours/vietnam/");
  check("   One guide per destination + passport (unique)", await rejects(
    db.visaCountry.create({ data: { countryId: vn!.id, passportCountryId: (await db.country.findUniqueOrThrow({ where: { isoCode: "IN" } })).id } }),
  ));
  console.log("Visa Finder");
  check("   Passports offered: India", (await findVisaPassports()).map((p) => p.isoCode).join() === "IN");
  const guides = await findVisaGuides("IN");
  check("   Destinations for the Indian passport: Japan, Vietnam", guides.map((g) => g.countrySlug).join() === "japan,vietnam");
  check("   Purposes come from the data (Japan: tourism + business)", guides[0].purposes.join() === "TOURISM,BUSINESS");
  check("   Match: India -> Vietnam -> tourism", (await findVisaMatch("IN", "vietnam", "TOURISM")).status === "match");
  check("   No type: India -> Vietnam -> business", (await findVisaMatch("IN", "vietnam", "BUSINESS")).status === "no-type");
  check("   No guide: unknown destination", (await findVisaMatch("IN", "atlantis", "TOURISM")).status === "no-guide");
  check("   No guide: passport without guides", (await findVisaMatch("US", "vietnam", "TOURISM")).status === "no-guide");
  check("   Thin type stays on the country page (Vietnam tourist)", (await findVisaTypeBySlug("vietnam", "tourist-visa")) === null && visa?.visaTypes[0].href === "/visa/vietnam/#tourist-visa");
  check("   Substantial type gets its own page (Japan business)", (await findVisaTypeBySlug("japan", "business-visa"))?.type.href === "/visa/japan/business-visa/");
  check("   Common documents counted from data", (await findCommonVisaDocuments()).length > 0);
  check("   General visa FAQs (placement VISA)", (await findGeneralVisaFaqs()).length === 2);

  // 10. Guide -> Destination
  const guide = await findGuideBySlug("best-time-to-visit-vietnam");
  check("10. Travel Guide belongs to a Destination", guide?.destination?.href === "/international-tours/vietnam/");
  const visaGuide = await findGuideBySlug("vietnam-visa-for-indians");
  check("    Country-level guide links to visa page + related guide", visaGuide?.country?.href === "/visa/vietnam/" && visaGuide.related.length === 1);

  // 11. FAQs
  check("11. FAQs connect to package", (await findFaqsForPackage("vietnam", "vietnam-7-days-6-nights")).length === 1);
  check("    FAQs connect to guide", guide?.faqs.length === 1);
  check("    Homepage FAQs (no owner)", (await findHomepageFaqs()).length === 4);
  const twoOwners = await rejects(
    db.fAQ.create({
      data: { question: "x", answer: "y", packageId: (await db.tourPackage.findFirstOrThrow()).id, destinationId: hanoi!.id },
    }),
  );
  check("    CHECK: an FAQ cannot have two owners", twoOwners);

  // 12. Reviews (created and removed here; none are seeded)
  const pkgRow = await db.tourPackage.findFirstOrThrow({ where: { slug: "vietnam-7-days-6-nights" } });
  const review = await db.review.create({
    data: { travellerName: "Verification Script", rating: 5, content: "Temporary test row.", packageId: pkgRow.id, status: "PUBLISHED", isSample: true },
  });
  cleanup.push(() => db.review.delete({ where: { id: review.id } }));
  const reviews = await findPublishedReviews({ packageId: pkgRow.id });
  check("12. Review connects to a package", reviews.length === 1 && reviews[0].destination === "Vietnam");
  check("    CHECK: rating must be 1-5", await rejects(db.review.create({ data: { travellerName: "x", rating: 6, content: "x" } })));

  // 13. Leads reference packages (through the validated write service)
  const lead = await createLead({
    name: "Verification Script",
    phone: "+91 00000 00000",
    travellers: "2",
    landingPage: "/international-tours/vietnam/",
    packageRef: { destinationSlug: "vietnam", packageSlug: "vietnam-7-days-6-nights" },
  });
  if (lead.ok) cleanup.push(() => db.lead.delete({ where: { id: lead.id } }));
  const leadRow = lead.ok ? await db.lead.findUnique({ where: { id: lead.id } }) : null;
  check("13. Lead references a package (resolved from public slugs)", leadRow?.packageId === pkgRow.id && leadRow.travellers === 2);
  const badLead = await createLead({ name: "", phone: "abc", email: "not-an-email", landingPage: "https://evil.example" });
  check("    Invalid lead rejected server-side with field errors", !badLead.ok && Object.keys(badLead.fieldErrors).length >= 3);
  const enquiry = await createEnquiry({ name: "Verification Script", email: "test@example.com", message: "Temporary test enquiry." });
  if (enquiry.ok) cleanup.push(() => db.enquiry.delete({ where: { id: enquiry.id } }));
  check("    Enquiry stored separately from leads", enquiry.ok);
  check("    Enquiry without any contact detail rejected", !(await createEnquiry({ name: "x", message: "hello there" })).ok);

  // 14. Slugs
  console.log("Slugs");
  check("14. Package found by clean URL parts", (await findPackageBySlug("vietnam", "vietnam-7-days-6-nights")) !== null);
  check("    Wrong destination for a package slug returns nothing", (await findPackageBySlug("japan", "vietnam-7-days-6-nights")) === null);
  check("    slugify('Vietnam 7 Days / 6 Nights')", slugify("Vietnam 7 Days / 6 Nights") === "vietnam-7-days-6-nights", slugify("Vietnam 7 Days / 6 Nights"));
  check("    Zod rejects 'Bad Slug!'", !slugSchema.safeParse("Bad Slug!").success);
  check("    CHECK rejects a malformed slug in the database", await rejects(db.region.create({ data: { name: "Bad", slug: "Bad Slug" } })));
  check("    Unique slug enforced", await rejects(db.destination.create({ data: { name: "Dup", slug: "vietnam", type: "CITY", scope: "INTERNATIONAL", countryId: vn!.id } })));

  console.log("Listing queries");
  check("Featured destinations", (await findFeaturedDestinations()).length === 3);
  check("Featured packages", (await findFeaturedPackages()).length === 2);
  check("Packages by category (family)", (await findPackages({ category: "family" })).length === 2);
  check("Country page data (Vietnam: destinations + visa link)", (await findCountryBySlug("vietnam"))?.visaHref === "/visa/vietnam/");
  check("Destination page data (Vietnam: gallery + related + SEO)", await findDestinationBySlug("vietnam").then((d) => d?.gallery.length === 2 && d.related[0]?.name === "Japan" && d.seo.title?.includes("sample")));
  check("Latest guides", (await findLatestGuides()).length === 2);
  check("Draft content is hidden", await (async () => {
    await db.tourPackage.update({ where: { id: pkgRow.id }, data: { status: "DRAFT" } });
    const hidden = (await findPackageBySlug("vietnam", "vietnam-7-days-6-nights")) === null;
    await db.tourPackage.update({ where: { id: pkgRow.id }, data: { status: "PUBLISHED" } });
    return hidden;
  })());
}

main()
  .catch((error) => {
    failures++;
    console.error(error);
  })
  .finally(async () => {
    for (const undo of cleanup.reverse()) await undo().catch(() => {});
    await db.$disconnect();
    console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
    process.exitCode = failures ? 1 : 0;
  });
