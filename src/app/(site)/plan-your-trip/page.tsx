import { Suspense } from "react";
import { getSearchSuggestions, getTourPackageBySlug } from "@/server/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { listingTrail } from "@/lib/seo/breadcrumbs";
import { routes } from "@/lib/routes";
import { siteConfig } from "@/config/site";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { PageHero } from "@/components/sections/page-hero";
import { EnquiryForm, type EnquiryDefaults } from "@/components/forms/enquiry-form";

export const metadata = buildMetadata({
  title: "Plan Your Trip",
  description: `Tell ${siteConfig.name} where and when you'd like to travel. We'll plan an itinerary around you.`,
  path: routes.planTrip(),
});

const steps = [
  ["Tell us about your trip", "Where, when, who's travelling and the kind of holiday you have in mind."],
  ["We design your itinerary", "A travel specialist suggests hotels, experiences and a day-by-day plan."],
  ["Refine and book", "Adjust anything until it feels right, then we take care of the details."],
] as const;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 200);

/** Pre-fills the form from ?package=, ?destination= or ?visa= (all validated or treated as plain text). */
async function FormWithContext({ searchParams }: { searchParams: PageProps<"/plan-your-trip">["searchParams"] }) {
  const params = await searchParams;
  const packageSlug = first(params.package);
  const [pkg, suggestions] = await Promise.all([
    packageSlug && /^[a-z0-9-]{2,120}$/.test(packageSlug) ? getTourPackageBySlug(packageSlug) : null,
    getSearchSuggestions(),
  ]);
  const visa = first(params.visa);
  const defaults: EnquiryDefaults = pkg
    ? { packageSlug: pkg.slug, packageName: pkg.name, destination: pkg.destinationRef.name }
    : visa
      ? { enquiryType: "visa", destination: visa === "help" ? undefined : visa, message: "I need help with a visa." }
      : { destination: first(params.destination) };

  return <EnquiryForm defaults={defaults} destinations={suggestions} formPath={routes.planTrip()} />;
}

export default function Page({ searchParams }: PageProps<"/plan-your-trip">) {
  return (
    <>
      <PageHero
        title="Plan your trip"
        eyebrow="Tailor-made holidays"
        intro="Share a few details and a travel specialist will design an itinerary around you. No obligation."
        breadcrumbs={listingTrail({ name: "Plan your trip", href: routes.planTrip() })}
      />
      <Section spacing="compact">
        <Container>
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Suspense fallback={<div className="h-[48rem] animate-pulse rounded-3xl bg-sand" aria-hidden="true" />}>
                <FormWithContext searchParams={searchParams} />
              </Suspense>
            </div>
            <aside className="lg:col-span-4 lg:col-start-9" aria-labelledby="how-title">
              <div className="rounded-3xl bg-brand-navy p-8 text-white lg:sticky lg:top-[calc(var(--spacing-header)+2rem)]">
                <h2 id="how-title" className="font-display text-h3">
                  How it works
                </h2>
                <ol className="mt-8 space-y-8">
                  {steps.map(([title, text], i) => (
                    <li key={title} className="flex gap-5">
                      <span className="font-display text-h3 leading-none text-brand-pink" aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="text-body-lg font-semibold">{title}</h3>
                        <p className="mt-1 text-body-sm text-white/75">{text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
