import type { VisaTypeView } from "@/types/content";
import { FaqAccordion } from "@/components/ui/faq-accordion";
import { SampleBadge } from "@/components/ui/badge";
import { Prose } from "@/components/content/prose";
import { formatPrice, padNumber } from "@/lib/format";
import { visaKindLabel, visaPurposeLabel } from "@/lib/labels";
import { visaUnknown } from "@/content/visa";
import { cn } from "@/lib/cn";

type Level = "h2" | "h3";

/**
 * Everything about one visa type, straight from the database:
 * key facts, eligibility, documents, numbered application steps, fees,
 * processing, notes and FAQs. Used on the country page, the visa type page
 * and the Visa Finder result.
 *
 * Fees and processing time are only present when the guide is verified
 * (the repository withholds them otherwise); in their place we show a clear
 * "contact the team" message. Nothing is ever estimated.
 */
export function VisaTypeDetails({
  type,
  headingLevel = "h3",
  isSample = false,
  showFaqs = true,
}: {
  type: VisaTypeView;
  /** Level for the sub-sections (Documents, How to apply...). */
  headingLevel?: Level;
  isSample?: boolean;
  showFaqs?: boolean;
}) {
  const H = headingLevel;
  const facts: [string, string][] = [
    ["Purpose", visaPurposeLabel[type.purpose]],
    ...(type.kind ? ([["Visa required?", visaKindLabel[type.kind]]] as [string, string][]) : []),
    ...(type.validity ? ([["Validity", type.validity]] as [string, string][]) : []),
    ...(type.maxStay ? ([["Length of stay", type.maxStay]] as [string, string][]) : []),
    ...(type.entries ? ([["Entries", type.entries]] as [string, string][]) : []),
  ];

  return (
    <div className="space-y-14">
      {isSample && <SampleBadge />}

      <dl className="grid gap-x-10 gap-y-6 border-y border-line py-8 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="eyebrow text-muted">{label}</dt>
            <dd className="mt-2 font-serif text-h4">{value}</dd>
          </div>
        ))}
        <div>
          <dt className="eyebrow text-muted">Processing time</dt>
          <dd className={cn("mt-2", type.processingTime ? "font-serif text-h4" : "text-body-sm text-muted")}>
            {type.processingTime ?? visaUnknown.processing}
          </dd>
        </div>
        <div>
          <dt className="eyebrow text-muted">Government fee</dt>
          <dd className={cn("mt-2", type.fee.amount !== null ? "font-serif text-h4" : "text-body-sm text-muted")}>
            {type.fee.amount !== null ? formatPrice(type.fee.amount, type.fee.currency) : visaUnknown.fee}
            {type.fee.amount !== null && type.feeNotes && (
              <span className="mt-1 block font-sans text-body-sm text-muted">{type.feeNotes}</span>
            )}
          </dd>
        </div>
      </dl>

      {type.description && <Prose text={type.description} />}

      {type.eligibility && (
        <section>
          <H className="text-h3">Who can apply</H>
          <Prose text={type.eligibility} className="mt-4 text-body" />
        </section>
      )}

      {type.requirements.length > 0 && (
        <section>
          <H className="text-h3">Required documents</H>
          <ul className="mt-6 border-t border-line">
            {type.requirements.map((r) => (
              <li key={r.title} className="grid gap-1 border-b border-line py-4 sm:grid-cols-[1fr_auto] sm:gap-6">
                <div>
                  <p className="text-body">{r.title}</p>
                  {r.description && <p className="mt-1 text-body-sm text-muted">{r.description}</p>}
                </div>
                {/* Text, not colour, says whether a document is required. */}
                <p className="caption text-muted sm:text-right">{r.required ? "Required" : "If applicable"}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {type.steps.length > 0 && (
        <section>
          <H className="text-h3">How to apply</H>
          <ol className="mt-6 grid gap-x-10 sm:grid-cols-2">
            {type.steps.map((step, i) => (
              <li key={step.title} className="flex gap-5 border-t border-line py-6">
                <span aria-hidden="true" className="font-serif text-h3 tabular-nums text-accent-strong">
                  {padNumber(i + 1)}
                </span>
                <div>
                  <p className="text-body-lg">{step.title}</p>
                  {step.description && <p className="mt-1 text-body-sm text-muted">{step.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {type.importantNotes && (
        <section className="border-l-2 border-accent pl-6">
          <H className="text-h4">Important notes</H>
          <Prose text={type.importantNotes} className="mt-3 text-body" />
        </section>
      )}

      {showFaqs && type.faqs.length > 0 && (
        <section>
          <H className="text-h3">Questions about the {type.name}</H>
          <FaqAccordion items={type.faqs} className="mt-6" />
        </section>
      )}
    </div>
  );
}
