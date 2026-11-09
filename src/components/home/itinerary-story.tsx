"use client";

import { useEffect, useRef, useState } from "react";
import type { ImageAsset } from "@/types/content";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { padNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

export type StoryDay = {
  dayNumber: number;
  title: string;
  location?: string;
  description?: string;
  image?: ImageAsset;
  /** Extra server-rendered content for the day (activities, meals, stay). */
  details?: React.ReactNode;
};

/**
 * Scroll-driven itinerary. On large screens a sticky photograph sits beside
 * the list of days; whichever day is in the middle of the viewport becomes
 * active and its photo cross-fades in. On small screens each day shows its own
 * photo inline. Without any photos it is simply an ordered list of days.
 *
 * All day text is rendered on the server in order (this client component only
 * tracks which day is active), so the itinerary is in the HTML for crawlers
 * and readable without JavaScript.
 */
export function ItineraryStory({ days }: { days: StoryDay[] }) {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const illustrated = days.some((d) => d.image);

  useEffect(() => {
    if (!illustrated) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.index));
          }
        }
      },
      // A thin band across the middle of the viewport decides the active day.
      { rootMargin: "-45% 0px -45% 0px" },
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [days.length, illustrated]);

  const current = days[active];
  // The sticky photo shows the active day's image, or the latest earlier one.
  const visibleImageIndex = (() => {
    for (let i = active; i >= 0; i--) if (days[i].image) return i;
    return days.findIndex((d) => d.image);
  })();

  return (
    <div className={cn("grid gap-12", illustrated && "lg:grid-cols-12 lg:gap-16")}>
      {illustrated && (
        // Decorative duplicate of the inline images (desktop only).
        <div aria-hidden="true" className="hidden lg:col-span-6 lg:block">
          <div className="sticky top-[calc(var(--spacing-header)+2rem)]">
            <div className="relative aspect-[4/5] max-h-[calc(100svh-var(--spacing-header)-4rem)] w-full overflow-hidden bg-sand">
              {days.map((day, index) =>
                day.image ? (
                  <div
                    key={day.dayNumber}
                    className={cn(
                      "absolute inset-0 transition-[opacity,scale] duration-(--duration-slow) ease-(--ease-editorial)",
                      index === visibleImageIndex ? "scale-100 opacity-100" : "scale-[1.04] opacity-0",
                    )}
                  >
                    <ResponsiveImage image={day.image} sizes="(min-width: 1024px) 45vw, 1px" />
                  </div>
                ) : null,
              )}
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/70 to-transparent p-8 text-white">
                <p className="type-display tabular-nums">{padNumber(current.dayNumber)}</p>
                {current.location && <p className="eyebrow mt-3 text-white/85">{current.location}</p>}
              </div>
            </div>

            <ol className="mt-6 flex gap-2">
              {days.map((day, index) => (
                <li
                  key={day.dayNumber}
                  className={cn(
                    "h-px flex-1 transition-colors duration-(--duration-base)",
                    index <= active ? "bg-ink" : "bg-line-strong",
                  )}
                />
              ))}
            </ol>
          </div>
        </div>
      )}

      <ol className={cn(illustrated && "lg:col-span-6 lg:col-start-7 xl:col-span-5 xl:col-start-8")}>
        {days.map((day, index) => (
          <li
            key={day.dayNumber}
            ref={(el) => {
              stepRefs.current[index] = el;
            }}
            data-index={index}
            aria-current={illustrated && index === active ? "step" : undefined}
            className={cn(
              "border-t border-line py-10 first:border-t-0 first:pt-0",
              illustrated && "lg:flex lg:min-h-[70svh] lg:flex-col lg:justify-center lg:border-t-0 lg:py-0",
            )}
          >
            {day.image && (
              <ResponsiveImage
                image={day.image}
                aspect="landscape"
                sizes="(min-width: 1024px) 1px, 100vw"
                className={cn("mb-7", illustrated && "lg:hidden")}
              />
            )}
            <p
              className={cn(
                "eyebrow transition-colors duration-(--duration-base)",
                illustrated && index === active ? "text-accent-strong" : "text-muted",
              )}
            >
              Day {padNumber(day.dayNumber)}
              {day.location && <span className="text-muted"> · {day.location}</span>}
            </p>
            {/* Inactive days are dimmed with a colour that still passes contrast, not opacity. */}
            <h3
              className={cn(
                "mt-4 text-h2 transition-colors duration-(--duration-base)",
                illustrated && (index === active ? "lg:text-ink" : "lg:text-muted"),
              )}
            >
              {day.title}
            </h3>
            {day.description && <p className="mt-5 max-w-md text-body-lg text-muted">{day.description}</p>}
            {day.details}
          </li>
        ))}
      </ol>
    </div>
  );
}
