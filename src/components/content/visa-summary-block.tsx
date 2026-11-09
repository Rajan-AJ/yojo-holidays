import type { VisaSummary } from "@/types/content";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { SampleBadge } from "@/components/ui/badge";

/**
 * Concise visa block for destination and package pages: visa type names,
 * processing time and the first few requirements, then a link to the full
 * visa page. Only shows what the visa record contains; renders nothing when
 * there is no published visa information.
 */
export function VisaSummaryBlock({ id, visa }: { id: string; visa?: VisaSummary }) {
  if (!visa) return null;

  return (
    <Section tone="ink" spacing="compact" aria-labelledby={id}>
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading id={id} eyebrow="Visa information" title={`${visa.countryName} visa`} inverse />
            {visa.isSample && <SampleBadge className="mt-6" />}
            {visa.shortAnswer && <p className="mt-6 text-body-lg text-canvas/80">{visa.shortAnswer}</p>}
            <ButtonLink href={visa.href} variant="inverse" className="mt-8">
              Full {visa.countryName} visa information
              <ArrowIcon />
            </ButtonLink>
          </div>

          {visa.types.length > 0 && (
            <ul className="divide-y divide-line-inverse border-y border-line-inverse lg:col-span-6 lg:col-start-7">
              {visa.types.map((type) => (
                <li key={type.name} className="py-6">
                  <h3 className="text-h4">{type.name}</h3>
                  {type.processingTime && (
                    <p className="mt-2 text-body-sm text-canvas/70">Processing time: {type.processingTime}</p>
                  )}
                  {type.requirements.length > 0 && (
                    <>
                      <p className="eyebrow mt-5 text-canvas/60">Typical documents</p>
                      <ul className="mt-3 space-y-1.5 text-body-sm text-canvas/85">
                        {type.requirements.map((r) => (
                          <li key={r} className="flex gap-3">
                            <span aria-hidden="true" className="text-accent">—</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </Section>
  );
}
