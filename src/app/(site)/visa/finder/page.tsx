import { Suspense } from "react";
import { z } from "zod";
import { findVisaMatch } from "@/server/queries";
import { safeLoad } from "@/server/safe-load";
import { SLUG_PATTERN } from "@/server/validation/common";
import { buildMetadata } from "@/lib/seo/metadata";
import { listingTrail, visaCrumb } from "@/lib/seo/breadcrumbs";
import { routes } from "@/lib/routes";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { PageHero } from "@/components/sections/page-hero";
import { VisaFinderSection } from "@/components/visa/visa-finder-section";
import { VisaResult } from "@/components/visa/visa-result";

// One canonical URL: answer combinations in the query string are not separate pages.
export const metadata = buildMetadata({
  title: "Visa Finder: What Visa Do I Need?",
  description: "Answer three quick questions to see the visa type, documents and application steps for your trip.",
  path: routes.visaFinder(),
});

/** Answers come from the URL: validated here, then re-checked against the database. */
const answersSchema = z.object({
  passport: z.string().regex(/^[A-Za-z]{2}$/).transform((v) => v.toUpperCase()).optional().catch(undefined),
  destination: z.string().max(120).regex(SLUG_PATTERN).optional().catch(undefined),
  purpose: z.enum(["TOURISM", "BUSINESS", "TRANSIT", "FAMILY_VISIT"]).optional().catch(undefined),
});

export default function VisaFinderPage({ searchParams }: PageProps<"/visa/finder">) {
  return (
    <>
      <PageHero
        title="Visa Finder"
        eyebrow="Visa assistance"
        intro="Three questions. Then the visa you need, the documents and how to apply."
        breadcrumbs={listingTrail({ name: "Visa Finder", href: routes.visaFinder() }, visaCrumb)}
        size="compact"
      />
      <Suspense
        fallback={
          <Container size="standard" className="py-section-sm">
            <LoadingState label="Loading the Visa Finder" rows={4} />
          </Container>
        }
      >
        <FinderBody searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function FinderBody({ searchParams }: Pick<PageProps<"/visa/finder">, "searchParams">) {
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const answers = answersSchema.parse({
    passport: first(raw.passport),
    destination: first(raw.destination),
    purpose: first(raw.purpose),
  });
  const complete = answers.passport && answers.destination && answers.purpose;

  if (!complete) {
    return (
      <Section tone="surface" aria-label="Visa Finder" spacing="compact">
        <Container size="standard">
          <VisaFinderSection headingLevel="h2" initial={answers} />
        </Container>
      </Section>
    );
  }

  const match = await safeLoad("visa finder", () =>
    findVisaMatch(answers.passport!, answers.destination!, answers.purpose!),
  );

  return (
    <>
      <Section id="result" aria-label="Your visa result" spacing="compact">
        <Container>
          {match ? (
            <VisaResult match={match} purpose={answers.purpose!} />
          ) : (
            <ErrorState
              title="We couldn't load your result just now."
              description="Please try again in a moment."
              action={<ButtonLink href={routes.visaFinder(answers)}>Try again</ButtonLink>}
            />
          )}
        </Container>
      </Section>
      <Section tone="surface" aria-labelledby="again-title" spacing="compact">
        <Container size="standard">
          <h2 id="again-title" className="eyebrow text-accent-strong">
            Check another trip
          </h2>
          <div className="mt-6">
            <VisaFinderSection headingLevel="h3" initial={{ passport: answers.passport }} />
          </div>
        </Container>
      </Section>
    </>
  );
}
