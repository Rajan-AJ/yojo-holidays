import { notFound, permanentRedirect } from "next/navigation";
import type { TourScope } from "@/types/content";
import {
  getDestinationBySlug,
  getDestinationFAQs,
  getDestinationGuides,
  getDestinationPackages,
  getDestinationScope,
  getDestinationSlugs,
} from "@/server/queries";
import { buildMetadata, truncateDescription } from "@/lib/seo/metadata";
import { JsonLd } from "@/lib/seo/json-ld";
import { touristDestinationSchema } from "@/lib/seo/schema";
import { destinationTrail } from "@/lib/seo/breadcrumbs";
import { routes } from "@/lib/routes";
import { siteConfig } from "@/config/site";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { PageHero } from "@/components/sections/page-hero";
import { QuickFacts } from "@/components/sections/quick-facts";
import { TourGrid } from "@/components/sections/tour-grid";
import { DestinationGrid } from "@/components/sections/destination-grid";
import { FaqSection } from "@/components/sections/faq-section";
import { CTASection } from "@/components/sections/cta-section";
import { JournalPreview } from "@/components/home/journal-preview";
import { VisaSummaryBlock } from "@/components/content/visa-summary-block";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Prose } from "@/components/content/prose";
import { Reveal } from "@/components/motion/reveal";

/**
 * Shared by /international-tours/[destination]/ and /domestic-tours/[destination]/.
 *
 * Canonical strategy: a destination has exactly one URL, under its own scope.
 * Requested under the other scope it permanently redirects (308); unknown
 * slugs 404. Both checks run before anything streams, so the status is real.
 */

const SLUG_FALLBACK = "__none__"; // keeps generateStaticParams non-empty (Cache Components rule)

export async function destinationStaticParams(scope: TourScope) {
  const slugs = await getDestinationSlugs(scope);
  return (slugs.length > 0 ? slugs : [SLUG_FALLBACK]).map((destination) => ({ destination }));
}

const MAX_TOURS_SHOWN = 8;

export async function destinationMetadata(scope: TourScope, slug: string) {
  const d = await getDestinationBySlug(slug);
  if (!d || d.scope !== scope) return {};
  return buildMetadata({
    title: `${d.name} Tour Packages`,
    description:
      truncateDescription(d.tagline ?? d.description) ??
      `${d.name} tour packages and travel information from ${siteConfig.name}.`,
    path: d.href,
    image: d.image,
    seo: d.seo,
  });
}

export async function DestinationPage({ scope, slug }: { scope: TourScope; slug: string }) {
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();
  if (destination.scope !== scope) {
    const actual = await getDestinationScope(slug);
    if (actual) permanentRedirect(routes.destination(actual, slug));
    notFound();
  }

  const [tours, guides, faqs] = await Promise.all([
    getDestinationPackages(slug),
    getDestinationGuides(slug),
    getDestinationFAQs(slug),
  ]);
  const d = destination;
  const shownTours = tours.slice(0, MAX_TOURS_SHOWN);
  const planHref = routes.planTrip({ destination: d.name });

  return (
    <>
      <PageHero
        title={`${d.name} Tour Packages`}
        eyebrow={d.region}
        intro={d.tagline}
        image={d.image}
        isSample={d.isSample}
        breadcrumbs={destinationTrail(d)}
        meta={
          <QuickFacts
            inverse
            facts={[
              d.tourCount > 0 && { label: "Journeys", value: d.tourCount },
              { label: "Ideal length", value: d.averageDuration },
            ]}
          />
        }
        actions={
          <>
            {tours.length > 0 && (
              <ButtonLink href="#tours" variant="inverse" size="lg">
                See {d.name} tours
              </ButtonLink>
            )}
            <ButtonLink href={planHref} variant="outline-inverse" size="lg">
              Plan your trip
            </ButtonLink>
          </>
        }
      />

      {/* Introduction + quick information */}
      {(d.description || d.bestTimeToVisit || d.gallery.length > 0) && (
        <Section aria-labelledby="explore-title">
          <Container>
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-7">
                <SectionHeading id="explore-title" eyebrow="Introduction" title={`Explore ${d.name}`} />
                <Prose text={d.description ?? d.tagline} className="mt-8" />
                {d.gallery.length > 0 && (
                  <div className="mt-12 grid grid-cols-2 gap-4">
                    {d.gallery.slice(0, 2).map((image) => (
                      <Reveal key={image.src} variant="imageReveal">
                        <ResponsiveImage image={image} aspect="portrait" sizes="(min-width: 1024px) 30vw, 50vw" />
                      </Reveal>
                    ))}
                  </div>
                )}
              </div>

              <aside aria-labelledby="facts-title" className="lg:col-span-4 lg:col-start-9">
                <div className="border-t border-ink pt-8 lg:sticky lg:top-[calc(var(--spacing-header)+2rem)]">
                  <h2 id="facts-title" className="text-h3">
                    Quick information
                  </h2>
                  <dl className="mt-6 divide-y divide-line">
                    {[
                      ["Country", d.type === "COUNTRY" ? undefined : d.country.name],
                      ["Region", d.regionName],
                      ["Ideal trip length", d.averageDuration],
                      ["Journeys available", d.tourCount > 0 ? String(d.tourCount) : undefined],
                    ]
                      .filter((row): row is [string, string] => Boolean(row[1]))
                      .map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-6 py-3 text-body-sm">
                          <dt className="text-muted">{label}</dt>
                          <dd className="text-right">{value}</dd>
                        </div>
                      ))}
                  </dl>
                  {d.bestTimeToVisit && (
                    <div className="mt-8">
                      <h3 className="eyebrow text-accent-strong">Best time to visit</h3>
                      <p className="mt-3 text-body">{d.bestTimeToVisit}</p>
                    </div>
                  )}
                  {d.visa && (
                    <ButtonLink href={d.visa.href} variant="ghost" className="mt-6">
                      {d.visa.countryName} visa information
                      <ArrowIcon />
                    </ButtonLink>
                  )}
                </div>
              </aside>
            </div>
          </Container>
        </Section>
      )}

      {shownTours.length > 0 && (
        <Section id="tours" tone="surface" aria-labelledby="tours-title">
          <Container size="wide">
            <SectionHeading
              id="tours-title"
              eyebrow="Featured tours"
              title={`${d.name} journeys`}
              intro={`${tours.length} ${tours.length === 1 ? "journey" : "journeys"} you can take as they are, or adapt.`}
              action={
                tours.length > MAX_TOURS_SHOWN && (
                  <ButtonLink href={`${routes.tours()}?destination=${d.slug}`} variant="ghost">
                    All {d.name} tours
                    <ArrowIcon />
                  </ButtonLink>
                )
              }
            />
            <TourGrid tours={shownTours} className="mt-block" />
          </Container>
        </Section>
      )}

      {d.places.length > 0 && (
        <Section aria-labelledby="places-title">
          <Container size="wide">
            <SectionHeading id="places-title" eyebrow="Things to experience" title={`Places to see in ${d.name}`} />
            <div className="mt-block">
              <DestinationGrid destinations={d.places} />
            </div>
          </Container>
        </Section>
      )}

      <VisaSummaryBlock id="visa-title" visa={d.visa} />

      <JournalPreview
        id="guides-title"
        eyebrow="Travel Journal"
        title={`${d.name} travel guides`}
        articles={guides}
      />

      <FaqSection id="faq-title" title="Frequently asked questions" items={faqs} showAllLink={false} />

      {d.related.length > 0 && (
        <Section tone="surface" aria-labelledby="related-title">
          <Container size="wide">
            <SectionHeading id="related-title" eyebrow="Keep exploring" title="Related destinations" />
            <div className="mt-block">
              <DestinationGrid destinations={d.related} />
            </div>
          </Container>
        </Section>
      )}

      <CTASection
        id="cta-title"
        eyebrow="Plan your trip"
        title={`Thinking about ${d.name}?`}
        description="Tell us when you'd like to go and who's travelling. We'll suggest an itinerary."
        primary={{ label: "Plan your trip", href: planHref }}
        secondary={{ label: "Contact us", href: routes.contact() }}
      />

      <JsonLd data={touristDestinationSchema(d)} />
    </>
  );
}
