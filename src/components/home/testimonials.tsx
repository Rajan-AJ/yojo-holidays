import type { ReviewView } from "@/types/content";
import { SampleBadge } from "@/components/ui/badge";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/cn";
import { HomeHeading, HomeSection, cardClass } from "./ui";

/** Real published reviews only. Renders nothing until there are some. */
export function Testimonials({ reviews }: { reviews: ReviewView[] }) {
  if (reviews.length === 0) return null;

  return (
    <HomeSection aria-labelledby="testimonials-title">
      <HomeHeading
        id="testimonials-title"
        eyebrow="Traveller stories"
        title="Loved by our"
        accent="happy travellers"
        description="Every journey tells a story. Here's what our travellers say after exploring the world with us."
      />
      <Stagger as="ul" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => {
          const meta = [review.destination, review.travelYear].filter(Boolean).join(" · ");
          return (
            <StaggerItem as="li" key={review.id} className="flex">
              <figure className={cn(cardClass, "flex w-full flex-col gap-4 border border-gray-100 p-6")}>
                <div className="flex items-center justify-between gap-3">
                  {review.rating !== null ? <Stars value={review.rating} /> : <span />}
                  {review.isSample && <SampleBadge />}
                </div>
                <blockquote className="flex-1">
                  <p className="text-[14px] italic leading-relaxed text-gray-600">“{review.body}”</p>
                </blockquote>
                <figcaption className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-brand-pink to-rose-400 font-display text-[15px] font-bold text-white"
                    >
                      {review.travellerName.charAt(0)}
                    </span>
                    <span>
                      <span className="block text-[14px] font-semibold leading-tight text-brand-navy">
                        {review.travellerName}
                      </span>
                      {meta && <span className="mt-0.5 block text-[12px] text-gray-400">{meta}</span>}
                    </span>
                  </span>
                  {review.verified && <span className="text-right text-xs text-gray-400">Verified traveller</span>}
                </figcaption>
              </figure>
            </StaggerItem>
          );
        })}
      </Stagger>
    </HomeSection>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <p className="flex items-center gap-0.5 text-amber-500">
      <span className="sr-only">Rated {value} out of 5</span>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} aria-hidden="true" viewBox="0 0 12 12" className="size-3.5">
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
