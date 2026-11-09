import Link from "next/link";
import type { TourSummary } from "@/types/content";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Badge, SampleBadge } from "@/components/ui/badge";
import { PriceDisplay } from "@/components/ui/price-display";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Tour package card. Receives a TourSummary (mapped from TourPackage), so it
 * works unchanged once real packages come from the database.
 */
export function TourCard({
  tour,
  sizes = "(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw",
  headingLevel: Heading = "h3",
  className,
}: {
  tour: TourSummary;
  sizes?: string;
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className="relative">
        <ResponsiveImage image={tour.image} aspect="tall" sizes={sizes} hoverZoom />
        <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
          {tour.isSample && <SampleBadge />}
          {tour.categories.slice(0, 2).map((category) => (
            <Badge key={category} tone="inverse" className="bg-ink/35 backdrop-blur-sm">
              {category}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-5">
        <p className="caption text-muted">
          {tour.destination}
          <span aria-hidden="true" className="mx-2 text-line-strong">
            ·
          </span>
          {formatDuration(tour.durationDays, tour.durationNights)}
        </p>
        <Heading className="mt-2 text-h4">
          <Link href={tour.href} className="after:absolute after:inset-0">
            {tour.name}
          </Link>
        </Heading>
        {tour.summary && (
          <p className="mt-2 line-clamp-2 text-body-sm text-muted">{tour.summary}</p>
        )}
        {/* mt-auto pins price to the bottom so a row of cards lines up. */}
        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-4 border-t border-line pt-4">
            <PriceDisplay price={tour.price} size="sm" />
            <span
              aria-hidden="true"
              className="text-body-sm font-medium underline decoration-ink/25 underline-offset-4 group-hover:decoration-ink"
            >
              View journey
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
