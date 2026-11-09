import { Suspense } from "react";
import { searchSite } from "@/server/queries";
import { normaliseQuery } from "@/server/repositories/search";
import { buildMetadata } from "@/lib/seo/metadata";
import { listingTrail } from "@/lib/seo/breadcrumbs";
import { routes } from "@/lib/routes";
import { primaryCta } from "@/config/site";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { InputField } from "@/components/ui/form-field";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { safeLoad } from "@/server/safe-load";
import { PageHero } from "@/components/sections/page-hero";
import { DestinationGrid } from "@/components/sections/destination-grid";
import { TourGrid } from "@/components/sections/tour-grid";

// Result pages for arbitrary queries should not be indexed.
export const metadata = buildMetadata({ title: "Search", path: routes.search(), noindex: true });

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <PageHero
        title="Search"
        eyebrow="Find a trip"
        intro="Search countries, destinations and tours."
        breadcrumbs={listingTrail({ name: "Search", href: routes.search() })}
        size="compact"
      />
      <Section aria-label="Search results" spacing="compact">
        <Container size="wide">
          <Suspense fallback={<LoadingState label="Searching" rows={3} />}>
            <Results searchParams={searchParams} />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const raw = (await searchParams).q;
  const q = normaliseQuery(Array.isArray(raw) ? raw[0] : raw);
  const results = q ? await safeLoad("search", () => searchSite(q)) : null;
  if (q && !results) {
    return (
      <ErrorState
        headingLevel="h2"
        title="Search isn't available right now."
        description="Please try again in a moment."
        action={<ButtonLink href={routes.search(q)}>Try again</ButtonLink>}
      />
    );
  }
  const count = results ? results.destinations.length + results.tours.length : 0;

  return (
    <>
      <form action={routes.search()} method="get" role="search" className="flex max-w-xl items-end gap-3">
        <InputField
          label="Search"
          hideLabel
          name="q"
          type="search"
          defaultValue={q ?? ""}
          placeholder="Try Vietnam, Tokyo or Kerala"
          className="flex-1"
        />
        <Button type="submit">Search</Button>
      </form>

      {q && (
        <p role="status" className="caption mt-6 text-muted">
          {count} {count === 1 ? "result" : "results"} for “{q}”
        </p>
      )}

      {results && results.destinations.length > 0 && (
        <div className="mt-12">
          <h2 className="text-h3">Destinations</h2>
          <div className="mt-8">
            <DestinationGrid destinations={results.destinations} />
          </div>
        </div>
      )}

      {results && results.tours.length > 0 && (
        <div className="mt-16">
          <h2 className="text-h3">Journeys</h2>
          <TourGrid tours={results.tours} columns={3} className="mt-8" />
        </div>
      )}

      {q && count === 0 && (
        <EmptyState
          className="mt-12"
          title={`Nothing found for “${q}”.`}
          description="We may still be able to plan it. Tell us where you'd like to go."
          action={<ButtonLink href={primaryCta.href}>{primaryCta.label}</ButtonLink>}
        />
      )}
    </>
  );
}
