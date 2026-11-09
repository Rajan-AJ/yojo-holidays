import type { TourSummary } from "@/types/content";
import { TourCard } from "@/components/cards/tour-card";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/cn";

/** The one grid every tour list uses (featured, listings, related, search). */
export function TourGrid({
  tours,
  columns = 4,
  headingLevel = "h3",
  className,
}: {
  tours: TourSummary[];
  /** Maximum columns on wide screens. */
  columns?: 3 | 4;
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  return (
    <Stagger
      as="ul"
      className={cn(
        "grid gap-x-6 gap-y-14 sm:grid-cols-2",
        columns === 4 ? "xl:grid-cols-4" : "lg:grid-cols-3",
        className,
      )}
    >
      {tours.map((tour) => (
        <StaggerItem as="li" key={tour.id} className="flex">
          <TourCard
            tour={tour}
            headingLevel={headingLevel}
            className="w-full"
            sizes={
              columns === 4
                ? "(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            }
          />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
