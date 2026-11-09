import type { DestinationSummary } from "@/types/content";
import { DestinationCard } from "@/components/cards/destination-card";
import { Stagger, StaggerItem } from "@/components/motion/reveal";

/** Even grid of destination cards (index pages, places, related destinations). */
export function DestinationGrid({
  destinations,
  headingLevel = "h3",
}: {
  destinations: DestinationSummary[];
  headingLevel?: "h2" | "h3";
}) {
  return (
    <Stagger as="ul" className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
      {destinations.map((destination) => (
        <StaggerItem as="li" key={destination.id}>
          <DestinationCard
            destination={destination}
            aspect="landscape"
            headingLevel={headingLevel}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
