import Link from "next/link";
import type { VisaCountryDetail } from "@/types/content";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatDate, formatPrice } from "@/lib/format";
import { visaKindLabel, visaPurposeLabel } from "@/lib/labels";
import { visaUnknown } from "@/content/visa";

/**
 * Answer-first block (AEO): the questions travellers actually ask, answered
 * directly from the guide's data. When the data is missing or unverified the
 * answer says so and points to the visa team; it never guesses.
 */
export function VisaQuickAnswers({ guide }: { guide: VisaCountryDetail }) {
  const { country, visaTypes } = guide;
  const who = guide.passport.demonym ? `${guide.passport.demonym} citizens` : `${guide.passport.name} passport holders`;
  const primary = visaTypes[0];
  const kinds = visaTypes.filter((t) => t.kind);
  const timed = visaTypes.filter((t) => t.processingTime);
  const priced = visaTypes.filter((t) => t.fee.amount !== null);

  const qa: { q: string; a: React.ReactNode }[] = [
    {
      q: `Do ${who} need a visa for ${country.name}?`,
      a:
        kinds.length > 0 || guide.shortAnswer ? (
          <>
            {guide.shortAnswer && <p>{guide.shortAnswer}</p>}
            {kinds.length > 0 && (
              <ul className="mt-2 space-y-1">
                {kinds.map((t) => (
                  <li key={t.slug}>
                    {visaPurposeLabel[t.purpose]}: {visaKindLabel[t.kind!]}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p>{visaUnknown.requirement}</p>
        ),
    },
    ...(primary && primary.requirements.length > 0
      ? [
          {
            q: `What documents are required for a ${country.name} ${primary.name.toLowerCase()}?`,
            a: (
              <>
                <ul className="space-y-1">
                  {primary.requirements.slice(0, 6).map((r) => (
                    <li key={r.title}>{r.title}</li>
                  ))}
                </ul>
                <Link href={primary.href} className="mt-3 inline-block text-ink underline underline-offset-4">
                  Full document list
                </Link>
              </>
            ),
          },
        ]
      : []),
    {
      q: `How long does a ${country.name} visa take?`,
      a:
        timed.length > 0 ? (
          <ul className="space-y-1">
            {timed.map((t) => (
              <li key={t.slug}>
                {t.name}: {t.processingTime}
              </li>
            ))}
          </ul>
        ) : (
          <p>{visaUnknown.processing}</p>
        ),
    },
    {
      q: `How much does a ${country.name} visa cost?`,
      a:
        priced.length > 0 ? (
          <ul className="space-y-1">
            {priced.map((t) => (
              <li key={t.slug}>
                {t.name}: {formatPrice(t.fee.amount!, t.fee.currency)} (government fee)
              </li>
            ))}
          </ul>
        ) : (
          <p>{visaUnknown.fee}</p>
        ),
    },
  ];

  return (
    <Section aria-labelledby="answers-title" spacing="compact">
      <Container>
        <SectionHeading id="answers-title" eyebrow="Quick answers" title={`${country.name} visa at a glance`} />
        <div className="mt-block grid gap-x-12 border-t border-line md:grid-cols-2">
          {qa.map(({ q, a }) => (
            <div key={q} className="border-b border-line py-7">
              <h3 className="text-h4">{q}</h3>
              <div className="mt-3 text-body text-muted">{a}</div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

/**
 * States plainly whether the guide has been checked against an official
 * source, and when. Unverified guides say so before anything else.
 */
export function VisaVerificationNote({ guide }: { guide: VisaCountryDetail }) {
  return (
    <aside aria-label="About this information" className="border-y border-line bg-surface">
      <Container className="py-5 text-body-sm">
        {guide.verified && guide.lastVerifiedAt ? (
          <p>
            Information last checked on <time dateTime={guide.lastVerifiedAt}>{formatDate(guide.lastVerifiedAt)}</time>
            {guide.sourceUrl && (
              <>
                {" "}against the{" "}
                <a href={guide.sourceUrl} rel="noopener noreferrer" target="_blank" className="underline underline-offset-4">
                  official source
                </a>
              </>
            )}
            . Visa rules can change; please confirm before you apply.
          </p>
        ) : (
          <p>
            <strong className="font-medium">This guide hasn&apos;t been verified yet.</strong> Please confirm the details with
            our visa team before you apply.
          </p>
        )}
      </Container>
    </aside>
  );
}
