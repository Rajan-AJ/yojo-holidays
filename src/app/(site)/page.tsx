import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Homepage skeleton (Phase 1).
 * Section order and copy follow the brief. Each section is a placeholder that
 * Phase 3 replaces with a real component fed from the database. No package,
 * visa or review data is hard-coded here.
 */
export default function HomePage() {
  return (
    <>
      {/* Hero: cinematic image/video lands in Phase 3. The H1 stays plain, crawlable HTML. */}
      <section
        aria-labelledby="hero-title"
        className="relative flex min-h-[92svh] items-end bg-ink pb-20 pt-(--spacing-header) text-white sm:pb-28"
      >
        <Container>
          <h1 id="hero-title" className="max-w-4xl text-display">
            Where will you go next?
          </h1>
          <p className="mt-6 max-w-md text-lg text-white/75">
            Thoughtfully planned journeys for curious travellers.
          </p>

          {/* Works without JavaScript: submits to the destinations listing. */}
          <form action="/destinations/" role="search" className="mt-10 flex max-w-lg">
            <label htmlFor="hero-search" className="sr-only">
              Search a destination
            </label>
            <input
              id="hero-search"
              name="q"
              type="search"
              placeholder="Search a destination"
              autoComplete="off"
              className="min-h-13 min-w-0 flex-1 rounded-l-full border border-r-0 border-white/30 bg-white/10 px-6 text-white placeholder:text-white/60 backdrop-blur focus:border-white focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-13 rounded-r-full bg-white px-6 text-sm font-medium text-ink hover:bg-canvas"
            >
              Search
            </button>
          </form>
        </Container>
      </section>

      <PlaceholderSection
        id="travel-finder"
        title="Not sure where to go?"
        intro="Tell us what kind of trip you're looking for. We'll help you find the right one."
        note="Travel Finder: Family, Honeymoon, Group, Luxury, Weekend, Custom"
      />
      <PlaceholderSection
        id="featured-destinations"
        title="Places worth going."
        intro="From quick escapes to faraway adventures."
        note="Featured destinations (from Destination.isFeatured)"
      />
      <PlaceholderSection
        id="domestic-international"
        title="India, and beyond."
        note="Domestic / International split"
        hidden
      />
      <PlaceholderSection
        id="featured-journeys"
        title="Journeys worth taking."
        intro="Carefully planned trips, ready when you are."
        note="4 to 6 featured packages (from TourPackage.isFeatured)"
      />
      <PlaceholderSection
        id="itinerary"
        title="Don't just see the destination. See the journey."
        note="Scroll-based itinerary (from ItineraryDay records)"
      />
      <PlaceholderSection
        id="visa"
        title="Your journey starts before you fly."
        intro="Not sure about visa requirements? Find the information you need and get assistance with your application."
        note="Visa Finder: Passport, Destination, Purpose"
      />
      <PlaceholderSection
        id="why-us"
        title="Travel should feel simple."
        note="Four editorial points"
      />
      <PlaceholderSection
        id="stories"
        title="They went. They loved it. They came back with stories."
        note="Published, real reviews only. Section is hidden when there are none."
      />
      <PlaceholderSection
        id="journal"
        title="The Travel Journal"
        intro="Helpful answers for better trips."
        note="Latest published travel guides"
      />
      <PlaceholderSection
        id="faq"
        title="Questions, answered."
        note="Homepage FAQs (FAQ.placement = HOMEPAGE), accessible accordion"
      />

      <section aria-labelledby="final-cta" className="py-(--spacing-section)">
        <Container className="text-center">
          <SectionHeading
            id="final-cta"
            align="center"
            title="Have a trip in mind?"
            intro="Tell us where you want to go. We'll help you plan the rest."
          />
          <ButtonLink href="/plan-your-trip/" className="mt-10">
            Plan My Trip
          </ButtonLink>
        </Container>
      </section>
    </>
  );
}

function PlaceholderSection({
  id,
  title,
  intro,
  note,
  hidden,
}: {
  id: string;
  title: string;
  intro?: string;
  note: string;
  /** Visually hidden heading for sections whose design has no visible H2. */
  hidden?: boolean;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="border-b border-line py-(--spacing-section)">
      <Container>
        {hidden ? (
          <h2 id={`${id}-title`} className="sr-only">
            {title}
          </h2>
        ) : (
          <SectionHeading id={`${id}-title`} title={title} intro={intro} />
        )}
        <div className="mt-12 grid min-h-48 place-items-center rounded-sm border border-dashed border-line text-sm text-muted">
          {note}
        </div>
      </Container>
    </section>
  );
}
