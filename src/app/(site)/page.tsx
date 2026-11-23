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
  getPackages,
  getPublishedReviews,
  getSearchSuggestions,
  getTopLevelDestinations,
  getTourCategories,
  getVisaDestinations,
  getVisaPassports,
} from "@/server/queries";
import { Hero } from "@/components/home/hero";
import { TrackRecord, type Stat } from "@/components/home/track-record";
import { PopularDestinations } from "@/components/home/popular-destinations";
import { Experiences } from "@/components/home/experiences";
import { HandpickedTours } from "@/components/home/handpicked-tours";
import { WhyChooseUs } from "@/components/home/why-choose-us";
import { VisaAssistance } from "@/components/home/visa-assistance";
import { JourneySteps } from "@/components/home/journey-steps";
import { Testimonials } from "@/components/home/testimonials";
import { TravelGuides } from "@/components/home/travel-guides";
import { HomeFaq } from "@/components/home/home-faq";
import { FinalCta } from "@/components/home/final-cta";
import { clientFigures, ctaImage, ctaPoints, hero, journeySteps, whyUs } from "@/content/home";

export const metadata = buildMetadata({ path: routes.home(), image: hero.image });

/** getPackages() is capped at this many rows; at the cap the figure shows "N+". */
const PACKAGE_COUNT_CAP = 60;

/**
 * Homepage. The hero is unchanged; everything below it uses the bold card
 * layout: track record → destinations → travel styles → packages → why us →
 * visa → steps → reviews → guides → FAQ → closing CTA.
 *
 * Each section receives typed data and hides itself when there is none (e.g.
 * Testimonials until real reviews exist). All queries are cached and run in
 * parallel, so the page is prerendered as static HTML.
 */
export default async function HomePage() {
  const [
    featured,
    international,
    domestic,
    tours,
    allTours,
    categories,
    visaDestinations,
    reviews,
    guides,
    faqs,
    suggestions,
    passports,
  ] = await Promise.all([
    getFeaturedDestinations(4),
    getTopLevelDestinations("INTERNATIONAL"),
    getTopLevelDestinations("DOMESTIC"),
    getFeaturedPackages(4),
    getPackages({}),
    getTourCategories(),
    getVisaDestinations(),
    getPublishedReviews({ limit: 3 }),
    getLatestGuides({ limit: 3 }),
    getHomepageFaqs(),
    getSearchSuggestions(),
    getVisaPassports(),
  ]);

  // Real figures only: client-confirmed numbers, then live database counts.
  const stats: Stat[] = [
    ...clientFigures.flatMap((f) => (f.value === null ? [] : [{ ...f, value: f.value }])),
    {
      icon: "map" as const,
      value: international.length + domestic.length,
      label: "Destinations",
      sublabel: "In India and abroad",
    },
    {
      icon: "route" as const,
      value: allTours.length,
      suffix: allTours.length >= PACKAGE_COUNT_CAP ? "+" : undefined,
      label: "Tour packages",
      sublabel: "Ready to book or tailor",
    },
    { icon: "compass" as const, value: categories.length, label: "Travel styles", sublabel: "Family, honeymoon & more" },
    { icon: "passport" as const, value: visaDestinations.length, label: "Visa guides", sublabel: "For Indian passport holders" },
  ].filter((s) => s.value > 0);

  return (
    <>
      <Hero
        {...hero}
        primaryCta={primaryCta}
        popular={featured.map((d) => ({ label: d.name, href: d.href }))}
        suggestions={suggestions}
      />
      <TrackRecord stats={stats} />
      <PopularDestinations international={international.slice(0, 6)} domestic={domestic.slice(0, 6)} />
      <Experiences categories={categories} />
      <HandpickedTours tours={tours} />
      <WhyChooseUs {...whyUs} />
      {visaDestinations.length > 0 && passports.length > 0 && (
        <VisaAssistance passports={passports} destinations={visaDestinations} />
      )}
      <JourneySteps {...journeySteps} cta={primaryCta} />
      <Testimonials reviews={reviews} />
      <TravelGuides articles={guides} />
      <HomeFaq items={faqs} />
      <FinalCta
        image={ctaImage}
        primary={primaryCta}
        secondary={{ label: "Contact us", href: routes.contact() }}
        points={ctaPoints}
      />
      <JsonLd data={organizationSchema()} />
    </>
  );
}
