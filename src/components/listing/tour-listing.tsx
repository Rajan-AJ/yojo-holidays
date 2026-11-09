import Link from "next/link";
import type { TourFilters } from "@/types/content";
import { getListingFacets, getPackages } from "@/server/queries";
import { SelectField } from "@/components/ui/form-field";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { safeLoad } from "@/server/safe-load";
import { TourGrid } from "@/components/sections/tour-grid";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";
import { durationLabels, hasActiveFilters, parseTourFilters, priceCeilings } from "./filters";

type Props = {
  /** Fixed scope/category of the page (not changeable by the visitor). */
  base: Pick<TourFilters, "scope" | "category">;
  /** The page's own path; the filter form submits back to it. */
  path: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Filters + results. A Server Component: the form is a plain GET form (no
 * client JavaScript), the results are rendered on the server. Rendered inside
 * <Suspense> by the page because it reads searchParams.
 */
export async function TourListing({ base, path, searchParams }: Props) {
  const requested = parseTourFilters(await searchParams);
  // The page's own scope/category always wins over the query string.
  const filters: TourFilters = { ...requested, ...stripUndefined(base) };
  const data = await safeLoad("tour listing", () => Promise.all([getListingFacets(base), getPackages(filters)]));
  if (!data) {
    return (
      <ErrorState
        headingLevel="h3"
        title="We couldn't load journeys just now."
        description="Please refresh the page in a moment."
        action={<ButtonLink href={path}>Try again</ButtonLink>}
      />
    );
  }
  const [facets, tours] = data;
  const active = hasActiveFilters(requested);

  const showDestination = facets.destinations.length > 1;
  const showCategory = !base.category && facets.categories.length > 1;
  const showDuration = facets.durations.length > 1;
  const showPrice = facets.hasPrices;
  const hasForm = showDestination || showCategory || showDuration || showPrice;

  return (
    <div>
      {hasForm && (
        <form
          action={path}
          method="get"
          aria-label="Filter tours"
          className="grid gap-5 border-y border-line py-6 sm:grid-cols-2 lg:flex lg:items-end lg:gap-6"
        >
          {showDestination && (
            <SelectField
              label="Destination"
              name="destination"
              defaultValue={requested.destination ?? ""}
              placeholder="All destinations"
              options={facets.destinations}
              className="lg:min-w-48"
            />
          )}
          {showCategory && (
            <SelectField
              label="Travel style"
              name="category"
              defaultValue={requested.category ?? ""}
              placeholder="All styles"
              options={facets.categories}
              className="lg:min-w-44"
            />
          )}
          {showDuration && (
            <SelectField
              label="Length"
              name="duration"
              defaultValue={requested.duration ?? ""}
              placeholder="Any length"
              options={facets.durations.map((d) => ({ value: d, label: durationLabels[d] }))}
              className="lg:min-w-40"
            />
          )}
          {showPrice && (
            <SelectField
              label="Budget per person"
              name="maxPrice"
              defaultValue={requested.maxPrice ? String(requested.maxPrice) : ""}
              placeholder="Any budget"
              options={priceCeilings.map((p) => ({ value: String(p), label: `Up to ${formatPrice(p, "INR")}` }))}
              className="lg:min-w-44"
            />
          )}
          <div className="flex items-center gap-5 sm:col-span-2 lg:ml-auto">
            <Button type="submit">Show tours</Button>
            {active && (
              <Link href={path} className="text-body-sm underline underline-offset-4 hover:text-accent-strong">
                Clear filters
              </Link>
            )}
          </div>
        </form>
      )}

      <p role="status" className="caption mt-6 text-muted">
        {tours.length} {tours.length === 1 ? "journey" : "journeys"}
        {active && " match your filters"}
      </p>

      {tours.length > 0 ? (
        <TourGrid tours={tours} columns={3} className="mt-10" />
      ) : (
        <EmptyState
          className="mt-10"
          headingLevel="h3"
          title={active ? "No journeys match these filters." : "No journeys here yet."}
          description="We plan custom trips too. Tell us where you'd like to go and we'll put an itinerary together."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              {active && (
                <ButtonLink href={path} variant="outline">
                  Clear filters
                </ButtonLink>
              )}
              <ButtonLink href={routes.planTrip()}>Plan a custom trip</ButtonLink>
            </div>
          }
        />
      )}
    </div>
  );
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
