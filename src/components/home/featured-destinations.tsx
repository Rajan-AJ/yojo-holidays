import type { DestinationSummary } from "@/types/content";
import type { AspectRatio } from "@/components/media/responsive-image";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { DestinationCard } from "@/components/cards/destination-card";
import { Reveal } from "@/components/motion/reveal";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";

/**
 * Asymmetric editorial grid. The composition repeats every four items, so it
 * holds up with any number of destinations from the database.
 */
const composition: { aspect: AspectRatio; className: string; sizes: string }[] = [
  { aspect: "portrait", className: "lg:col-span-7", sizes: "(min-width: 1024px) 55vw, (min-width: 640px) 50vw, 100vw" },
  { aspect: "tall", className: "lg:col-span-5 lg:mt-32", sizes: "(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw" },
  { aspect: "landscape", className: "lg:col-span-5", sizes: "(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw" },
  { aspect: "wide", className: "lg:col-span-7 lg:mt-16", sizes: "(min-width: 1024px) 55vw, (min-width: 640px) 50vw, 100vw" },
];

export function FeaturedDestinations({ destinations }: { destinations: DestinationSummary[] }) {
  if (destinations.length === 0) return null;

  return (
    <Section tone="surface" aria-labelledby="destinations-title">
      <Container size="wide">
        <SectionHeading
          id="destinations-title"
          eyebrow="Featured destinations"
          title="Places worth going."
          intro="From quick escapes to faraway adventures."
          action={
            <ButtonLink href={routes.destinations()} variant="ghost">
              All destinations
              <ArrowIcon />
            </ButtonLink>
          }
        />

        <div className="mt-block grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-20">
          {destinations.map((destination, index) => {
            const slot = composition[index % composition.length];
            return (
              <Reveal key={destination.id} className={cn(slot.className)}>
                <DestinationCard destination={destination} aspect={slot.aspect} sizes={slot.sizes} />
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
