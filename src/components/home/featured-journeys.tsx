import type { TourSummary } from "@/types/content";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { TourCard } from "@/components/cards/tour-card";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { routes } from "@/lib/routes";

export function FeaturedJourneys({ tours }: { tours: TourSummary[] }) {
  if (tours.length === 0) return null;

  return (
    <Section aria-labelledby="journeys-title">
      <Container size="wide">
        <SectionHeading
          id="journeys-title"
          eyebrow="Featured journeys"
          title="Journeys worth taking."
          intro="Carefully planned trips, ready when you are."
          action={
            <ButtonLink href={routes.tours()} variant="ghost">
              View all tours
              <ArrowIcon />
            </ButtonLink>
          }
        />

        <Stagger as="ul" className="mt-block grid gap-x-6 gap-y-14 sm:grid-cols-2 xl:grid-cols-4">
          {tours.map((tour) => (
            <StaggerItem as="li" key={tour.id} className="flex">
              <TourCard tour={tour} className="w-full" />
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </Section>
  );
}
