import Link from "next/link";
import type { VisaMatch } from "@/server/repositories/visa";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { visaPurposeLabel } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { VisaTypeDetails } from "./visa-type-details";

/**
 * Visa Finder result, rendered on the server from the database. Three
 * outcomes: a matching visa type, a guide without that purpose, or no guide.
 * The last two never show invented information; they point to the visa team.
 */
export function VisaResult({ match, purpose }: { match: VisaMatch; purpose: string }) {
  if (match.status === "no-guide") {
    return (
      <EmptyState
        title="We couldn't find a matching visa guide yet."
        description="Our visa team can still tell you what you need for this trip."
        action={<ButtonLink href={routes.planTrip({ visa: "help" })}>Talk to our visa team</ButtonLink>}
      />
    );
  }

  const { guide } = match;
  const visaCtaHref = routes.planTrip({ visa: guide.country.name });

  if (match.status === "no-type") {
    return (
      <EmptyState
        title={`We don't have a ${visaPurposeLabel[purpose as keyof typeof visaPurposeLabel]?.toLowerCase() ?? ""} visa guide for ${guide.country.name} yet.`}
        description="Our visa team can help, or see the visa types we do cover."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href={visaCtaHref}>Talk to our visa team</ButtonLink>
            <ButtonLink href={guide.country.href} variant="outline">
              {guide.country.name} visa guide
            </ButtonLink>
          </div>
        }
      />
    );
  }

  const { type } = match;
  return (
    <article aria-labelledby="result-title">
      <p className="eyebrow text-accent-strong">
        Your result{guide.passport.demonym ? ` · ${guide.passport.demonym} passport` : ""}
      </p>
      <h2 id="result-title" className="mt-4 text-h1">
        {guide.country.name} {type.name}
      </h2>
      {guide.shortAnswer && <p className="mt-5 max-w-2xl text-body-lg text-muted">{guide.shortAnswer}</p>}

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href={visaCtaHref} size="lg">
          Get visa assistance
          <ArrowIcon />
        </ButtonLink>
        {guide.destination && (
          <ButtonLink href={guide.destination.href} variant="outline" size="lg">
            View {guide.country.name} tours
          </ButtonLink>
        )}
      </div>

      <div className="mt-14">
        <VisaTypeDetails type={type} isSample={guide.isSample} />
      </div>

      <p className="mt-12 text-body-sm text-muted">
        Full guide:{" "}
        <Link href={type.href} className="text-ink underline underline-offset-4 hover:text-accent-strong">
          {guide.country.name} visa for {guide.passport.demonym ?? guide.passport.name} travellers
        </Link>
      </p>
    </article>
  );
}
