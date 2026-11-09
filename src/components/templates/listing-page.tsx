import { Suspense } from "react";
import Link from "next/link";
import type { ImageAsset, TourFilters } from "@/types/content";
import { getFeaturedPackages, getListingFacets, getTourCategories } from "@/server/queries";
import type { Crumb } from "@/components/ui/breadcrumbs";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { LoadingState } from "@/components/ui/states";
import { PageHero } from "@/components/sections/page-hero";
import { TourGrid } from "@/components/sections/tour-grid";
import { CTASection } from "@/components/sections/cta-section";
import { TourListing } from "@/components/listing/tour-listing";
import { Prose } from "@/components/content/prose";
import { routes } from "@/lib/routes";
import { primaryCta } from "@/config/site";

/** Show a separate "featured" row only when the full listing is long enough to need it. */
const FEATURED_THRESHOLD = 6;

/**
 * One template for every tour listing: /tours/, /international-tours/,
 * /domestic-tours/ and /{style}-tours/. The hero, introduction, featured row
 * and related styles are static; only the filtered results (which read the
 * URL) stream inside <Suspense>.
 */
export async function ListingPage({
  title,
  eyebrow,
  intro,
  description,
  image,
  breadcrumbs,
  base,
  path,
  searchParams,
}: {
  title: string;
  eyebrow?: string;
  intro?: string;
  /** Longer introduction / helpful information. */
  description?: string;
  image?: ImageAsset;
  breadcrumbs: Crumb[];
  base: Pick<TourFilters, "scope" | "category">;
  path: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [facets, featured, categories] = await Promise.all([
    getListingFacets(base),
    getFeaturedPackages(3, base),
    getTourCategories(),
  ]);
  const showFeatured = facets.total > FEATURED_THRESHOLD && featured.length > 0;
  const otherStyles = categories.filter((c) => c.id !== base.category);

  return (
    <>
      <PageHero title={title} eyebrow={eyebrow} intro={intro} image={image} breadcrumbs={breadcrumbs} size="compact" />

      {description && (
        <Section aria-labelledby="intro-title" spacing="compact">
          <Container size="standard">
            <div className="grid gap-8 lg:grid-cols-12">
              <h2 id="intro-title" className="text-h3 lg:col-span-4">
                About these trips
              </h2>
              <Prose text={description} className="lg:col-span-8" />
            </div>
          </Container>
        </Section>
      )}

      {showFeatured && (
        <Section tone="surface" aria-labelledby="featured-title" spacing="compact">
          <Container size="wide">
            <SectionHeading id="featured-title" eyebrow="Featured" title="Our favourite journeys" />
            <TourGrid tours={featured} columns={3} className="mt-block" />
          </Container>
        </Section>
      )}

      <Section aria-labelledby="listing-title" spacing="compact">
        <Container size="wide">
          <SectionHeading id="listing-title" eyebrow="Tour listing" title="All journeys" />
          <div className="mt-10">
            <Suspense fallback={<LoadingState label="Loading journeys" rows={4} className="py-10" />}>
              <TourListing base={base} path={path} searchParams={searchParams} />
            </Suspense>
          </div>
        </Container>
      </Section>

      {otherStyles.length > 0 && (
        <Section tone="sand" aria-labelledby="styles-title" spacing="compact">
          <Container size="wide">
            <SectionHeading id="styles-title" eyebrow="Travel styles" title="Find your kind of trip" />
            <ul className="mt-10 flex flex-wrap gap-2">
              {otherStyles.map((c) => (
                <li key={c.id}>
                  <Link
                    href={c.href}
                    className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface px-5 text-body-sm transition-colors hover:border-ink"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={routes.destinations()}
                  className="inline-flex min-h-11 items-center rounded-full px-5 text-body-sm underline underline-offset-4 hover:text-accent-strong"
                >
                  Browse by destination
                </Link>
              </li>
            </ul>
          </Container>
        </Section>
      )}

      <CTASection
        id="cta-title"
        eyebrow="Plan your trip"
        title="Not seeing the right trip?"
        description="Tell us where and when. We'll plan something around you."
        primary={primaryCta}
        secondary={{ label: "Contact us", href: routes.contact() }}
      />
    </>
  );
}
