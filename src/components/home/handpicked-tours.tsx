import Link from "next/link";
import type { TourSummary } from "@/types/content";
import { SampleBadge } from "@/components/ui/badge";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { formatDuration, formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { Icon } from "./icons";
import { Arrow, HomeButton, HomeHeading, HomeSection, cardClass } from "./ui";

/** Featured packages as lifted cards, plus a nudge towards a custom trip. */
export function HandpickedTours({ tours }: { tours: TourSummary[] }) {
  if (tours.length === 0) return null;

  return (
    <HomeSection tone="gray" aria-labelledby="packages-title">
      <HomeHeading
        id="packages-title"
        eyebrow="Handpicked for you"
        title="Tour"
        accent="packages"
        description="Carefully planned journeys with hotels, transfers and sightseeing arranged for you."
        action={
          <HomeButton href={routes.tours()} variant="outline">
            View all packages
            <Arrow />
          </HomeButton>
        }
      />

      <Stagger as="ul" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {tours.map((tour) => (
          <StaggerItem as="li" key={tour.id} className="flex">
            <PackageCard tour={tour} />
          </StaggerItem>
        ))}
      </Stagger>

      <div className="mt-12 text-center">
        <p className="mb-4 text-[14px] text-gray-500">
          Don&apos;t see what you&apos;re looking for? <span className="font-semibold text-brand-navy">We build fully custom packages too.</span>
        </p>
        <HomeButton href={routes.planTrip()} variant="navy" size="lg">
          Request a custom package
          <Arrow />
        </HomeButton>
      </div>
    </HomeSection>
  );
}

function PackageCard({ tour }: { tour: TourSummary }) {
  return (
    <article className={cn(cardClass, "group relative flex w-full flex-col overflow-hidden")}>
      <div className="relative h-52 overflow-hidden">
        <ResponsiveImage
          image={tour.image}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          imageClassName="transition-transform duration-500 group-hover:scale-105"
        />
        {tour.isSample && (
          <div className="absolute left-3 top-3">
            <SampleBadge />
          </div>
        )}
        {tour.categories[0] && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            {tour.categories[0]}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1 text-[11.5px] font-bold uppercase tracking-wide text-brand-teal-dark">
            <Icon name="map" className="size-3.5 shrink-0" />
            <span className="truncate">{tour.destination}</span>
          </span>
          <span className="shrink-0 text-[11.5px] font-medium text-gray-400">
            {formatDuration(tour.durationDays, tour.durationNights)}
          </span>
        </div>
        <h3 className="mb-1 font-display text-[17px] font-bold leading-tight text-brand-navy transition-colors group-hover:text-brand-pink">
          <Link href={tour.href} className="after:absolute after:inset-0">
            {tour.name}
          </Link>
        </h3>
        {tour.summary && <p className="mb-3 line-clamp-2 text-[12.5px] leading-snug text-gray-500">{tour.summary}</p>}

        {tour.categories.length > 1 && (
          <ul className="mb-4 flex flex-wrap gap-1.5">
            {tour.categories.slice(1, 4).map((category) => (
              <li
                key={category}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600"
              >
                <Icon name="check" className="size-3 text-brand-teal-dark" />
                {category}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          {tour.price.amount === null ? (
            <div>
              <p className="mb-0.5 text-[11px] text-gray-400">Price</p>
              <p className="font-display text-[15px] font-bold text-brand-navy">On request</p>
            </div>
          ) : (
            <div>
              <p className="mb-0.5 text-[11px] text-gray-400">Starting from</p>
              <p className="font-display text-[22px] font-extrabold leading-none text-brand-pink">
                {formatPrice(tour.price.amount, tour.price.currency)}
              </p>
              <p className="text-[11px] text-gray-400">per person</p>
            </div>
          )}
          <span
            aria-hidden="true"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand-pink px-4 text-[13px] font-semibold text-white transition-colors duration-200 group-hover:bg-brand-pink-dark"
          >
            View
            <Arrow className="size-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
