import type { ReviewView } from "@/types/content";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { SampleBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

function Rating({ value }: { value: number }) {
  return (
    <p className="flex items-center gap-1 text-accent-strong">
      <span className="sr-only">Rated {value} out of 5</span>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} aria-hidden="true" viewBox="0 0 12 12" className="size-3">
          <path
            d="M6 .8l1.6 3.3 3.6.5-2.6 2.5.6 3.6L6 9l-3.2 1.7.6-3.6L.8 4.6l3.6-.5z"
            fill={i < value ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth=".8"
          />
        </svg>
      ))}
    </p>
  );
}

/**
 * A traveller's review, set as a pull quote. Only real, staff-approved reviews
 * should reach this in production; samples are visibly marked.
 */
export function ReviewCard({ review, className }: { review: ReviewView; className?: string }) {
  const meta = [review.destination, review.travelYear].filter(Boolean).join(", ");

  return (
    <figure className={cn("flex h-full flex-col border-t border-ink pt-8", className)}>
      <div className="flex items-center justify-between gap-4">
        {review.rating !== null ? <Rating value={review.rating} /> : <span />}
        {review.isSample && <SampleBadge />}
      </div>
      <blockquote className="mt-6 flex-1">
        <p className="font-serif text-h4 italic">“{review.body}”</p>
      </blockquote>
      <figcaption className="mt-8 flex items-center gap-4">
        {review.image && (
          <ResponsiveImage
            image={review.image}
            aspect="square"
            sizes="48px"
            className="size-12 shrink-0 rounded-full"
          />
        )}
        <div>
          <p className="text-body-sm font-medium">{review.travellerName}</p>
          {meta && <p className="caption text-muted">{meta}</p>}
        </div>
      </figcaption>
    </figure>
  );
}
