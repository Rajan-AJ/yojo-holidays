import { getCommonVisaDocuments, getLatestGuides, getVisaFAQs, getVisaGuides } from "@/server/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/lib/seo/json-ld";
import { visaServiceSchema } from "@/lib/seo/schema";
import { listingTrail, visaCrumb } from "@/lib/seo/breadcrumbs";
import { routes } from "@/lib/routes";
import { visaConfig } from "@/config/site";
import type { DestinationSummary } from "@/types/content";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { PageHero } from "@/components/sections/page-hero";
import { DestinationGrid } from "@/components/sections/destination-grid";
import { FaqSection } from "@/components/sections/faq-section";
import { CTASection } from "@/components/sections/cta-section";
import { JournalPreview } from "@/components/home/journal-preview";
import { VisaFinderSection } from "@/components/visa/visa-finder-section";
import { padNumber } from "@/lib/format";
import { visaHero, visaProcess } from "@/content/visa";

export const metadata = buildMetadata({
  title: "Visa Assistance: Requirements, Documents & Help Applying",
  description: visaHero.intro,
  path: routes.visa(),
});

export default async function VisaPage() {
  const [guides, documents, faqs, articles] = await Promise.all([
    getVisaGuides(visaConfig.defaultPassportIso),
    getCommonVisaDocuments(),
    getVisaFAQs(),
    getLatestGuides({ category: "VISA_GUIDE", limit: 4 }),
  ]);

  // Visa guides shown with the existing destination cards (photo required).
  const popular: DestinationSummary[] = guides.flatMap((g) =>
    g.image
      ? [
          {
            id: g.countrySlug,
            name: `${g.countryName} visa`,
            region: g.typeNames.length === 1 ? g.typeNames[0] : `${g.typeNames.length} visa types`,
            tagline: g.shortAnswer,
            scope: "INTERNATIONAL" as const,
            href: g.href,
            image: g.image,
            isSample: g.isSample,
          },
        ]
      : [],
  );

  return (
    <>
      <PageHero
        title={visaHero.title}
        eyebrow="Visa assistance"
        intro={visaHero.intro}
        breadcrumbs={listingTrail(visaCrumb)}
        size="compact"
        actions={
          <>
            <ButtonLink href="#finder" variant="inverse" size="lg">
              Find my visa
            </ButtonLink>
            <ButtonLink href={routes.planTrip({ visa: "help" })} variant="outline-inverse" size="lg">
              Talk to a visa expert
            </ButtonLink>
          </>
        }
      />

      <Section id="finder" tone="surface" aria-labelledby="finder-title">
        <Container size="standard">
          <p id="finder-title" className="eyebrow text-accent-strong">
            Visa Finder
          </p>
          <div className="mt-6">
            <VisaFinderSection />
          </div>
        </Container>
      </Section>

      {popular.length > 0 && (
        <Section aria-labelledby="popular-title">
          <Container size="wide">
            <SectionHeading id="popular-title" eyebrow="Visa guides" title="Popular visa destinations" />
            <div className="mt-block">
              <DestinationGrid destinations={popular} />
            </div>
          </Container>
        </Section>
      )}

      <Section tone="ink" aria-labelledby="process-title">
        <Container>
          <SectionHeading id="process-title" eyebrow="How it works" title="How visa assistance works" inverse />
          <ol className="mt-block grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
            {visaProcess.map((step, i) => (
              <li key={step.title} className="border-t border-line-inverse py-8">
                <span aria-hidden="true" className="font-serif text-h2 text-accent">
                  {padNumber(i + 1)}
                </span>
                <h3 className="mt-4 text-h4">{step.title}</h3>
                <p className="mt-2 text-body-sm text-canvas/70">{step.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {documents.length > 0 && (
        <Section aria-labelledby="documents-title" spacing="compact">
          <Container size="standard">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <SectionHeading
                  id="documents-title"
                  eyebrow="Documents"
                  title="Documents you'll usually need"
                  intro="The documents that come up most often across our visa guides. Exact requirements differ by destination and visa type."
                />
              </div>
              <ul className="border-t border-line lg:col-span-6 lg:col-start-7">
                {documents.map((d) => (
                  <li key={d.title} className="flex items-baseline justify-between gap-6 border-b border-line py-4">
                    <span className="text-body">{d.title}</span>
                    <span className="caption shrink-0 text-muted">
                      {d.guides} {d.guides === 1 ? "visa type" : "visa types"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </Section>
      )}

      <FaqSection id="faq-title" title="Visa questions" items={faqs} showAllLink={false} />

      <JournalPreview id="guides-title" eyebrow="Travel Journal" title="Visa guides and tips" articles={articles} />

      <CTASection
        id="cta-title"
        eyebrow="Visa assistance"
        title="Not sure what you need?"
        description="Tell us where you're going. Our team will help you understand the requirements and the process."
        primary={{ label: "Talk to a visa expert", href: routes.planTrip({ visa: "help" }) }}
        secondary={{ label: "Open the Visa Finder", href: routes.visaFinder() }}
      />

      <JsonLd data={visaServiceSchema({ name: "Visa assistance", path: routes.visa(), description: visaHero.intro })} />
    </>
  );
}
