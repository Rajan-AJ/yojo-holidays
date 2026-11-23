import Link from "next/link";
import type { DestinationSummary, TourScope } from "@/types/content";
import { SampleBadge } from "@/components/ui/badge";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { Tabs, type Tab } from "./destination-tabs";
import { Arrow, HomeButton, HomeHeading, HomeSection, cardClass, imagePillClass } from "./ui";

const tabLabel: Record<TourScope, string> = { INTERNATIONAL: "International", DOMESTIC: "Domestic" };

/** International | Domestic tabs, each a grid of destination cards. */
export function PopularDestinations({
  international,
  domestic,
}: {
  international: DestinationSummary[];
  domestic: DestinationSummary[];
}) {
  const groups: [TourScope, DestinationSummary[]][] = [
    ["INTERNATIONAL", international],
    ["DOMESTIC", domestic],
  ];
  const tabs: Tab[] = groups
    .filter(([, list]) => list.length > 0)
    .map(([scope, list]) => ({
      id: scope.toLowerCase(),
      label: tabLabel[scope],
      panel: (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((destination) => (
            <li key={destination.id} className="flex">
              <DestinationTile destination={destination} />
            </li>
          ))}
        </ul>
      ),
    }));

  if (tabs.length === 0) return null;

  return (
    <HomeSection tone="gray" aria-labelledby="destinations-title">
      <Tabs
        tabs={tabs}
        label="Destination category"
        header={
          <HomeHeading
            id="destinations-title"
            eyebrow="Explore the world"
            title="Popular destinations"
            accent="we cover"
            description="Handpicked domestic and international destinations, each with tours planned door to door."
            className="mb-0 sm:mb-0"
          />
        }
      />
      <div className="mt-10 text-center">
        <HomeButton href={routes.destinations()} variant="outline" size="lg">
          View all destinations
          <Arrow />
        </HomeButton>
      </div>
    </HomeSection>
  );
}

function DestinationTile({ destination }: { destination: DestinationSummary }) {
  const tours = destination.tourCount ?? 0;
  return (
    <article className={cn(cardClass, "group relative flex w-full flex-col overflow-hidden")}>
      <div className="relative h-52 overflow-hidden">
        <ResponsiveImage
          image={destination.image}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
          imageClassName="transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {destination.isSample && <SampleBadge />}
          {destination.region && <span className={imagePillClass}>{destination.region}</span>}
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="font-display text-[17px] font-bold text-brand-navy transition-colors group-hover:text-brand-pink">
            <Link href={destination.href} className="after:absolute after:inset-0">
              {destination.name}
            </Link>
          </h3>
          {tours > 0 && (
            <span className="mt-0.5 shrink-0 text-[12px] font-medium text-gray-400">
              {tours} {tours === 1 ? "tour" : "tours"}
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3">
          <p className="line-clamp-1 text-[12.5px] text-gray-500">{destination.tagline ?? "Tours and travel guide"}</p>
          <span
            aria-hidden="true"
            className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-brand-pink opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            View
            <Arrow className="size-3" />
          </span>
        </div>
      </div>
    </article>
  );
}
