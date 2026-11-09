import Link from "next/link";
import type { DestinationSummary } from "@/types/content";
import { ResponsiveImage, type AspectRatio } from "@/components/media/responsive-image";
import { SampleBadge } from "@/components/ui/badge";
import { ArrowIcon } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * Editorial destination card: image, then a caption beneath (not text on top
 * of the photo), so the photography stays clean. `aspect` lets a grid mix
 * portrait and landscape compositions.
 */
export function DestinationCard({
  destination,
  aspect = "portrait",
  sizes = "(min-width: 1024px) 50vw, (min-width: 640px) 50vw, 100vw",
  headingLevel: Heading = "h3",
  className,
}: {
  destination: DestinationSummary;
  aspect?: AspectRatio;
  sizes?: string;
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  return (
    <article className={cn("group relative", className)}>
      <ResponsiveImage image={destination.image} aspect={aspect} sizes={sizes} hoverZoom />
      <div className="mt-5 flex items-start justify-between gap-6">
        <div>
          {destination.region && (
            <p className="eyebrow text-muted">{destination.region}</p>
          )}
          <Heading className="mt-2 text-h3">
            {/* Stretched link: the whole card is clickable, the link text is the name. */}
            <Link href={destination.href} className="after:absolute after:inset-0">
              {destination.name}
            </Link>
          </Heading>
          {destination.tagline && (
            <p className="mt-2 max-w-sm text-body-sm text-muted">{destination.tagline}</p>
          )}
          {destination.tourCount ? (
            <p className="caption mt-3 text-ink">
              {destination.tourCount} {destination.tourCount === 1 ? "journey" : "journeys"}
            </p>
          ) : null}
        </div>
        <ArrowIcon className="mt-9 size-5 text-muted group-hover:text-ink" />
      </div>
      {destination.isSample && <SampleBadge className="absolute left-3 top-3" />}
    </article>
  );
}
