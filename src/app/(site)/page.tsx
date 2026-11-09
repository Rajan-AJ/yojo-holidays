import { primaryCta } from "@/config/site";
import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/lib/seo/json-ld";
import { organizationSchema } from "@/lib/seo/schema";
import { routes } from "@/lib/routes";
import {
  getFeaturedDestinations,
  getFeaturedPackages,
  getHomepageFaqs,
  getLatestGuides,
  getPublishedReviews,
  getSearchSuggestions,
  getShowcaseItinerary,
  getTourCategories,
  getVisaDestinations,
  getVisaPassports,
} from "@/server/queries";
import { Hero } from "@/components/home/hero";
import { TravelFinder } from "@/components/home/travel-finder";
import { FeaturedDestinations } from "@/components/home/featured-destinations";
import { ScopeSplit } from "@/components/home/scope-split";
import { FeaturedJourneys } from "@/components/home/featured-journeys";
import { ItinerarySection } from "@/components/home/itinerary-section";
import { VisaAssistance } from "@/components/home/visa-assistance";
import { WhyUs } from "@/components/home/why-us";
import { TravellerStories } from "@/components/home/traveller-stories";
import { JournalPreview } from "@/components/home/journal-preview";
import { FaqSection } from "@/components/sections/faq-section";
import { CTASection } from "@/components/sections/cta-section";
import { hero, scopeSplit, visaImage, whyUs } from "@/content/home";

export const metadata = buildMetadata({ path: routes.home(), image: hero.image });

/**
 * Homepage. Each section receives typed data and hides itself when there is
 * none (e.g. Traveller Stories until real reviews exist). All queries are
 * cached and run in parallel, so the page is prerendered as static HTML.
 */
export default async function HomePage() {
  const [destinations, tours, categories, itinerary, visaDestinations, reviews, guides, faqs, suggestions, passports] =
    await Promise.all([
      getFeaturedDestinations(4),
      getFeaturedPackages(4),
      getTourCategories(),
      getShowcaseItinerary(),
      getVisaDestinations(),
      getPublishedReviews({ limit: 3 }),
      getLatestGuides({ limit: 4 }),
      getHomepageFaqs(),
      getSearchSuggestions(),
      getVisaPassports(),
    ]);

  return (
    <>
      <Hero
        {...hero}
        primaryCta={primaryCta}
        popular={destinations.map((d) => ({ label: d.name, href: d.href }))}
        suggestions={suggestions}
      />
      <TravelFinder categories={categories} />
      <FeaturedDestinations destinations={destinations} />
      <ScopeSplit {...scopeSplit} />
      <FeaturedJourneys tours={tours} />
      {itinerary && <ItinerarySection {...itinerary} />}
      {visaDestinations.length > 0 && passports.length > 0 && (
        <VisaAssistance passports={passports} destinations={visaDestinations} image={visaImage} />
      )}
      <WhyUs {...whyUs} />
      <TravellerStories reviews={reviews} />
      <JournalPreview
        articles={guides}
        categories={["DESTINATION_GUIDE", "VISA_GUIDE", "TRAVEL_TIPS", "THINGS_TO_DO"]}
      />
      <FaqSection id="faq-title" items={faqs} />
      <CTASection
        id="final-cta-title"
        eyebrow="Plan your trip"
        title="Have a trip in mind?"
        description="Tell us where you want to go. We'll help you plan the rest."
        primary={primaryCta}
        secondary={{ label: "Contact us", href: routes.contact() }}
      />
      <JsonLd data={organizationSchema()} />
    </>
  );
}
