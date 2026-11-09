import type { ItineraryDayView } from "@/types/content";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { SampleBadge } from "@/components/ui/badge";
import { ItineraryStory } from "./itinerary-story";

export function ItinerarySection({
  tourName,
  href,
  days,
  isSample,
}: {
  tourName: string;
  href: string;
  days: ItineraryDayView[];
  isSample?: boolean;
}) {
  if (days.length === 0) return null;

  return (
    <Section tone="sand" aria-labelledby="itinerary-title">
      <Container size="wide">
        <SectionHeading
          id="itinerary-title"
          eyebrow={tourName}
          title="Don't just see the destination. See the journey."
          className="mb-block"
        />
        {isSample && <SampleBadge className="-mt-8 mb-block" />}
        <ItineraryStory days={days} />
        <div className="mt-block">
          <ButtonLink href={href} variant="outline">
            See the full itinerary
            <ArrowIcon />
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
