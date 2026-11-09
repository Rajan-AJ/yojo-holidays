import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCountryDestinations,
  getCountryGuides,
  getCountryPackages,
  getVisaCountryBySlug,
  getVisaParams,
} from "@/server/queries";
import { buildMetadata, truncateDescription } from "@/lib/seo/metadata";
import { JsonLd } from "@/lib/seo/json-ld";
import { visaServiceSchema } from "@/lib/seo/schema";
import { visaCountryTrail } from "@/lib/seo/breadcrumbs";
import { visaPurposeLabel } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { siteConfig } from "@/config/site";
import { visaAudience, visaGuideTitle } from "@/components/visa/visa-titles";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { PageHero } from "@/components/sections/page-hero";
import { QuickFacts } from "@/components/sections/quick-facts";
import { TourGrid } from "@/components/sections/tour-grid";
import { DestinationGrid } from "@/components/sections/destination-grid";
import { FaqSection } from "@/components/sections/faq-section";
import { CTASection } from "@/components/sections/cta-section";
import { JournalPreview } from "@/components/home/journal-preview";
import { Prose } from "@/components/content/prose";
import { VisaTypeDetails } from "@/components/visa/visa-type-details";
import { VisaQuickAnswers, VisaVerificationNote } from "@/components/visa/visa-quick-answers";

/**
 * /visa/{country}/: the visa guide for the site's default passport.
 * Unknown countries get a real 404 from src/proxy.ts before rendering.
 */

export async function generateStaticParams() {
  const { countries } = await getVisaParams();
  // Cache Components requires at least one param; the fallback simply 404s.
  return (countries.length > 0 ? countries : ["__none__"]).map((country) => ({ country }));
}

export async function generateMetadata({ params }: PageProps<"/visa/[country]">) {
  const guide = await getVisaCountryBySlug((await params).country);
  if (!guide) return {};
  const who = visaAudience(guide);
  return buildMetadata({
    title: `${guide.country.name} Visa for ${who}: Requirements & Process`,
    description:
      truncateDescription(guide.description) ??
      `What ${who} need to know about a ${guide.country.name} visa: visa types, documents and how to apply, with help from ${siteConfig.name}.`,
    path: guide.country.href,
    image: guide.image,
    seo: guide.seo,
  });
}

export default async function VisaCountryPage({ params }: PageProps<"/visa/[country]">) {
  const slug = (await params).country;
  const guide = await getVisaCountryBySlug(slug);
  if (!guide) notFound();

  const [tours, guides, countryDestinations] = await Promise.all([
    getCountryPackages(slug),
    getCountryGuides(slug),
    getCountryDestinations(slug),
  ]);
  // Places inside the country; the country itself is already linked ("View ... tours").
  const destinations = countryDestinations.filter((d) => d.href !== guide.destination?.href);
  const { country, visaTypes } = guide;
  const helpHref = routes.planTrip({ visa: country.name });

  return (
    <>
      <PageHero
        title={visaGuideTitle(guide)}
        eyebrow="Visa guide"
        intro={guide.shortAnswer}
        image={guide.image}
        isSample={guide.isSample}
        breadcrumbs={visaCountryTrail(country)}
        meta={
          <QuickFacts
            inverse
            facts={[
              visaTypes.length > 0 && { label: "Visa types", value: visaTypes.length },
              { label: "For", value: guide.passport.demonym ? `${guide.passport.demonym} passports` : guide.passport.name },
            ]}
          />
        }
        actions={
          <>
            <ButtonLink href={helpHref} variant="inverse" size="lg">
              Get visa assistance
              <ArrowIcon />
            </ButtonLink>
            {guide.destination && (
              <ButtonLink href={guide.destination.href} variant="outline-inverse" size="lg">
                View {country.name} tours
              </ButtonLink>
            )}
          </>
        }
      />

      <VisaVerificationNote guide={guide} />
      <VisaQuickAnswers guide={guide} />

      {(guide.description || guide.importantNotes) && (
        <Section tone="surface" aria-labelledby="about-title" spacing="compact">
          <Container size="standard">
            <div className="grid gap-10 lg:grid-cols-12">
              <h2 id="about-title" className="text-h2 lg:col-span-4">
                About the {country.name} visa
              </h2>
              <div className="space-y-8 lg:col-span-8">
                <Prose text={guide.description} />
                {guide.importantNotes && (
                  <div className="border-l-2 border-accent pl-6">
                    <h3 className="text-h4">Important notes</h3>
                    <Prose text={guide.importantNotes} className="mt-3 text-body" />
                  </div>
                )}
              </div>
            </div>
          </Container>
        </Section>
      )}

      {visaTypes.length > 1 && (
        <nav aria-label={`${country.name} visa types`} className="border-b border-line">
          <Container className="flex flex-wrap items-center gap-x-6 gap-y-2 py-5 text-body-sm">
            <span className="eyebrow text-muted">Visa types</span>
            {visaTypes.map((t) => (
              <Link key={t.slug} href={t.href} className="underline underline-offset-4 hover:text-accent-strong">
                {t.name}
              </Link>
            ))}
          </Container>
        </nav>
      )}

      {visaTypes.map((type, i) => (
        <Section
          key={type.slug}
          id={type.slug}
          tone={i % 2 === 0 ? "canvas" : "sand"}
          aria-labelledby={`${type.slug}-title`}
          spacing="compact"
        >
          <Container>
            <SectionHeading id={`${type.slug}-title`} eyebrow={visaPurposeLabel[type.purpose]} title={type.name} />
            <div className="mt-10">
              {type.hasOwnPage ? (
                // Full detail lives on its own page; keep this a short, linked summary (no duplicate content).
                <div className="max-w-2xl">
                  <Prose text={type.description} />
                  <p className="mt-4 text-body-sm text-muted">
                    {type.requirements.length} documents · {type.steps.length} application steps
                  </p>
                  <ButtonLink href={type.href} variant="outline" className="mt-6">
                    Full {type.name.toLowerCase()} guide
                    <ArrowIcon />
                  </ButtonLink>
                </div>
              ) : (
                <VisaTypeDetails type={type} isSample={guide.isSample} />
              )}
            </div>
          </Container>
        </Section>
      ))}

      <FaqSection id="faq-title" title={`${country.name} visa questions`} items={guide.faqs} showAllLink={false} />

      {tours.length > 0 && (
        <Section tone="surface" aria-labelledby="tours-title">
          <Container size="wide">
            <SectionHeading
              id="tours-title"
              eyebrow="Travel there"
              title={`${country.name} tours`}
              action={
                guide.destination && (
                  <ButtonLink href={guide.destination.href} variant="ghost">
                    All {country.name} tours
                    <ArrowIcon />
                  </ButtonLink>
                )
              }
            />
            <TourGrid tours={tours} columns={3} className="mt-block" />
          </Container>
        </Section>
      )}

      <JournalPreview id="guides-title" eyebrow="Travel Journal" title={`${country.name} travel guides`} articles={guides} />

      {destinations.length > 0 && (
        <Section aria-labelledby="destinations-title">
          <Container size="wide">
            <SectionHeading id="destinations-title" eyebrow="Explore" title={`Places to visit in ${country.name}`} />
            <div className="mt-block">
              <DestinationGrid destinations={destinations.slice(0, 6)} />
            </div>
          </Container>
        </Section>
      )}

      <CTASection
        id="cta-title"
        eyebrow="Visa assistance"
        title="Need help with your visa?"
        description="Let our travel team help you understand the process and prepare your application."
        primary={{ label: "Get visa assistance", href: helpHref }}
        secondary={{ label: "Use the Visa Finder", href: routes.visaFinder() }}
        tone="ink"
      />

      {!guide.isSample && (
        <JsonLd
          data={visaServiceSchema({
            name: `${country.name} visa assistance`,
            path: country.href,
            description: guide.shortAnswer,
            country: country.name,
          })}
        />
      )}
    </>
  );
}
