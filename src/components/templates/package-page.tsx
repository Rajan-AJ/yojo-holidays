import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { TourScope } from "@/types/content";
import {
  getDestinationGuides,
  getPackageFAQs,
  getPackageParams,
  getPackageReviews,
  getPackageScope,
  getRelatedPackages,
  getTourPackageBySlug,
} from "@/server/queries";
import { buildMetadata, truncateDescription } from "@/lib/seo/metadata";
import { JsonLd } from "@/lib/seo/json-ld";
import { tourSchemas } from "@/lib/seo/schema";
import { packageTrail } from "@/lib/seo/breadcrumbs";
import { formatDuration, formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";
import { siteConfig } from "@/config/site";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { PageHero } from "@/components/sections/page-hero";
import { QuickFacts } from "@/components/sections/quick-facts";
import { TourGrid } from "@/components/sections/tour-grid";
import { FaqSection } from "@/components/sections/faq-section";
import { CTASection } from "@/components/sections/cta-section";
import { JournalPreview } from "@/components/home/journal-preview";
import { TravellerStories } from "@/components/home/traveller-stories";
import { ItineraryStory } from "@/components/home/itinerary-story";
import { VisaSummaryBlock } from "@/components/content/visa-summary-block";
import { Prose } from "@/components/content/prose";
import {
  DayDetails,
  HighlightsSection,
  ImportantInfoSection,
  InclusionsSection,
  StaysAndMealsSection,
  countMeals,
} from "@/components/package/package-sections";

/**
 * Shared by /{scope}-tours/[destination]/[package]/.
 *
 * The package is looked up by BOTH slugs, so a package under the wrong
 * destination 404s. Under the wrong scope it redirects (308) to its one
 * canonical URL. Both happen before streaming, so the status is real.
 */

const FALLBACK = { destination: "__none__", package: "__none__" }; // non-empty params (Cache Components rule)

export async function packageStaticParams(scope: TourScope) {
  const params = await getPackageParams(scope);
  return params.length > 0 ? params : [FALLBACK];
}

export async function packageMetadata(scope: TourScope, destinationSlug: string, packageSlug: string) {
  const p = await getTourPackageBySlug(destinationSlug, packageSlug);
  if (!p || p.destinationRef.scope !== scope) return {};
  const duration = formatDuration(p.durationDays, p.durationNights);
  return buildMetadata({
    title: p.name,
    description:
      truncateDescription(p.summary ?? p.description) ??
      `${p.name}: a ${duration} ${p.destinationRef.name} itinerary from ${siteConfig.name}.`,
    path: p.href,
    image: p.image,
    seo: p.seo,
  });
}

export async function PackagePage({
  scope,
  destinationSlug,
  packageSlug,
}: {
  scope: TourScope;
  destinationSlug: string;
  packageSlug: string;
}) {
  const pkg = await getTourPackageBySlug(destinationSlug, packageSlug);
  if (!pkg) notFound();
  if (pkg.destinationRef.scope !== scope) {
    const actual = await getPackageScope(destinationSlug, packageSlug);
    if (actual) permanentRedirect(routes.tour(actual, destinationSlug, packageSlug));
    notFound();
  }

  const [related, reviews, faqs, guides] = await Promise.all([
    getRelatedPackages(pkg),
    getPackageReviews(pkg.id),
    getPackageFAQs(destinationSlug, packageSlug),
    // Guides come from the top-level destination (Vietnam), not a city inside it.
    getDestinationGuides(pkg.topDestinationSlug, 3),
  ]);

  const duration = formatDuration(pkg.durationDays, pkg.durationNights);
  const priceText =
    pkg.price.amount !== null ? `From ${formatPrice(pkg.price.amount, pkg.price.currency)}` : "Price on request";
  const planHref = routes.planTrip({ destination: pkg.destinationRef.name, package: pkg.name });
  const meals = countMeals(pkg.itinerary);
  const places = [...new Set(pkg.itinerary.map((d) => d.location).filter(Boolean))];
  const nights = pkg.hotels.filter((h) => !h.isOption).reduce((n, h) => n + h.nights, 0);

  return (
    <>
      <PageHero
        title={pkg.name}
        eyebrow={pkg.destinationRef.name}
        intro={pkg.summary}
        image={pkg.image}
        isSample={pkg.isSample}
        breadcrumbs={packageTrail(pkg)}
        meta={
          <QuickFacts
            inverse
            facts={[
              { label: "Duration", value: duration },
              {
                label: "Starting price",
                value: pkg.price.note && pkg.price.amount !== null ? `${priceText} ${pkg.price.note}` : priceText,
              },
            ]}
          />
        }
        actions={
          <>
            <ButtonLink href={planHref} variant="inverse" size="lg">
              Plan this trip
              <ArrowIcon />
            </ButtonLink>
            {pkg.itinerary.length > 0 && (
              <ButtonLink href="#itinerary" variant="outline-inverse" size="lg">
                See the itinerary
              </ButtonLink>
            )}
          </>
        }
      />

      {/* Quick trip information */}
      <Section aria-labelledby="overview-title" spacing="compact">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <SectionHeading id="overview-title" eyebrow="Overview" title="About this trip" />
              <Prose text={pkg.description ?? pkg.summary} className="mt-8" />
            </div>
            <div className="border-t border-ink pt-8 lg:col-span-4 lg:col-start-9">
              <h2 className="sr-only">Quick trip information</h2>
              <QuickFacts
                className="sm:grid sm:grid-cols-2 sm:gap-x-8"
                facts={[
                  { label: "Duration", value: duration },
                  { label: "Price", value: priceText },
                  places.length > 0 && { label: "Visiting", value: places.join(", ") },
                  nights > 0 && { label: "Hotel nights", value: nights },
                ]}
              />
              {pkg.categoryRefs.length > 0 && (
                <div className="mt-8">
                  <p className="eyebrow text-muted">Travel style</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {pkg.categoryRefs.map((c) => (
                      <li key={c.slug}>
                        <Link
                          href={c.href}
                          className="inline-flex min-h-9 items-center rounded-full border border-line-strong px-3.5 text-body-sm transition-colors hover:border-ink"
                        >
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <ButtonLink href={pkg.destinationRef.href} variant="ghost" className="mt-6">
                More about {pkg.destinationRef.name}
                <ArrowIcon />
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>

      <HighlightsSection items={pkg.highlights} />

      {pkg.itinerary.length > 0 && (
        <Section id="itinerary" tone="sand" aria-labelledby="itinerary-title">
          <Container size="wide">
            <SectionHeading
              id="itinerary-title"
              eyebrow={duration}
              title="Day-by-day itinerary"
              className="mb-block"
            />
            <ItineraryStory
              days={pkg.itinerary.map((day) => ({
                dayNumber: day.dayNumber,
                title: day.title,
                location: day.location,
                description: day.description,
                image: day.image,
                details: <DayDetails day={day} />,
              }))}
            />
          </Container>
        </Section>
      )}

      <StaysAndMealsSection hotels={pkg.hotels} meals={meals} />
      <InclusionsSection included={pkg.inclusions} excluded={pkg.exclusions} />
      <VisaSummaryBlock id="visa-title" visa={pkg.visa} />
      <ImportantInfoSection text={pkg.importantInfo} />
      <TravellerStories reviews={reviews} id="reviews-title" title="What travellers say" />
      <FaqSection id="faq-title" title="Frequently asked questions" items={faqs} showAllLink={false} />

      {related.length > 0 && (
        <Section tone="surface" aria-labelledby="related-title">
          <Container size="wide">
            <SectionHeading id="related-title" eyebrow="You might also like" title="Related journeys" />
            <TourGrid tours={related} columns={3} className="mt-block" />
          </Container>
        </Section>
      )}

      <JournalPreview id="guides-title" eyebrow="Travel Journal" title="Before you go" articles={guides} />

      <CTASection
        id="cta-title"
        eyebrow="Plan this trip"
        title="Make this journey yours."
        description="Change the pace, the hotels or the dates. Tell us what you have in mind."
        primary={{ label: "Plan this trip", href: planHref }}
        secondary={{ label: "Contact us", href: routes.contact() }}
      />

      <JsonLd data={tourSchemas(pkg, reviews)} />
    </>
  );
}
