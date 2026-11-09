import { getTopLevelDestinations } from "@/server/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { listingTrail } from "@/lib/seo/breadcrumbs";
import { scopeTitle } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { primaryCta } from "@/config/site";
import type { TourScope } from "@/types/content";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { PageHero } from "@/components/sections/page-hero";
import { DestinationGrid } from "@/components/sections/destination-grid";
import { CTASection } from "@/components/sections/cta-section";

const intro = "Countries and regions we plan trips to, in India and around the world.";

export const metadata = buildMetadata({ title: "Destinations", description: intro, path: routes.destinations() });

/** Destination index: top-level destinations grouped by scope. */
export default async function DestinationsPage() {
  const [international, domestic] = await Promise.all([
    getTopLevelDestinations("INTERNATIONAL"),
    getTopLevelDestinations("DOMESTIC"),
  ]);
  const groups: [TourScope, typeof international][] = [
    ["INTERNATIONAL", international],
    ["DOMESTIC", domestic],
  ];

  return (
    <>
      <PageHero
        title="Destinations"
        eyebrow="Where we go"
        intro={intro}
        breadcrumbs={listingTrail({ name: "Destinations", href: routes.destinations() })}
        size="compact"
      />

      {international.length + domestic.length === 0 && (
        <Container className="py-section-sm">
          <EmptyState title="Destinations are on their way." description="Check back soon, or tell us where you'd like to go." />
        </Container>
      )}

      {groups.map(
        ([scope, list], i) =>
          list.length > 0 && (
            <Section key={scope} tone={i === 0 ? "canvas" : "surface"} aria-labelledby={`${scope}-title`}>
              <Container size="wide">
                <SectionHeading
                  id={`${scope}-title`}
                  title={scope === "INTERNATIONAL" ? "International" : "India"}
                  action={
                    <ButtonLink href={routes.scope(scope)} variant="ghost">
                      All {scopeTitle[scope].toLowerCase()}
                      <ArrowIcon />
                    </ButtonLink>
                  }
                />
                <div className="mt-block">
                  <DestinationGrid destinations={list} />
                </div>
              </Container>
            </Section>
          ),
      )}

      <CTASection
        id="cta-title"
        title="Somewhere else in mind?"
        description="We plan custom trips to places not listed here too."
        primary={primaryCta}
      />
    </>
  );
}
