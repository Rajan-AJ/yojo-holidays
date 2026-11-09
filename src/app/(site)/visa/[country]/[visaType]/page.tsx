import Link from "next/link";
import { notFound } from "next/navigation";
import { getCountryGuides, getCountryPackages, getVisaParams, getVisaTypeBySlug } from "@/server/queries";
import { buildMetadata, truncateDescription } from "@/lib/seo/metadata";
import { JsonLd } from "@/lib/seo/json-ld";
import { faqSchema, visaServiceSchema } from "@/lib/seo/schema";
import { visaCountryTrail } from "@/lib/seo/breadcrumbs";
import { visaPurposeLabel } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { PageHero } from "@/components/sections/page-hero";
import { TourGrid } from "@/components/sections/tour-grid";
import { CTASection } from "@/components/sections/cta-section";
import { JournalPreview } from "@/components/home/journal-preview";
import { VisaTypeDetails } from "@/components/visa/visa-type-details";
import { VisaVerificationNote } from "@/components/visa/visa-quick-answers";
import { visaAudience } from "@/components/visa/visa-titles";

/**
 * /visa/{country}/{visaType}/: only for visa types with enough content to
 * stand on their own (see hasOwnPage in the visa repository). Thinner types
 * live on the country page; their URLs 404 (proxy) rather than becoming thin
 * SEO pages.
 */

export async function generateStaticParams() {
  const { types } = await getVisaParams();
  // Cache Components requires at least one param; the fallback simply 404s.
  return types.length > 0 ? types : [{ country: "__none__", visaType: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/visa/[country]/[visaType]">) {
  const { country, visaType } = await params;
  const found = await getVisaTypeBySlug(country, visaType);
  if (!found) return {};
  const { guide, type } = found;
  return buildMetadata({
    title: `${guide.country.name} ${type.name} for ${visaAudience(guide)}`,
    description:
      truncateDescription(type.description) ??
      `${guide.country.name} ${type.name.toLowerCase()}: documents, application steps and help with your application.`,
    path: type.href,
    image: guide.image,
  });
}

export default async function VisaTypePage({ params }: PageProps<"/visa/[country]/[visaType]">) {
  const { country: countrySlug, visaType } = await params;
  const found = await getVisaTypeBySlug(countrySlug, visaType);
  if (!found) notFound();
  const { guide, type } = found;
  const { country } = guide;

  const [tours, guides] = await Promise.all([getCountryPackages(countrySlug), getCountryGuides(countrySlug)]);
  const helpHref = routes.planTrip({ visa: `${country.name} ${type.name}` });
  const otherTypes = guide.visaTypes.filter((t) => t.slug !== type.slug);
  const who = guide.passport.demonym ? `${guide.passport.demonym} Travellers` : `${guide.passport.name} Passport Holders`;

  return (
    <>
      <PageHero
        title={`${country.name} ${type.name} for ${who}`}
        eyebrow={`${visaPurposeLabel[type.purpose]} visa`}
        intro={guide.shortAnswer}
        image={guide.image}
        isSample={guide.isSample}
        size="compact"
        breadcrumbs={visaCountryTrail(country, { name: type.name, href: type.href })}
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

      <Section aria-label={`${type.name} details`} spacing="compact">
        <Container>
          <VisaTypeDetails type={type} headingLevel="h2" isSample={guide.isSample} />
        </Container>
      </Section>

      <Section tone="sand" aria-labelledby="more-title" spacing="compact">
        <Container>
          <SectionHeading id="more-title" eyebrow="Also useful" title={`More about the ${country.name} visa`} />
          <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-body">
            <li>
              <Link href={country.href} className="underline underline-offset-4 hover:text-accent-strong">
                {country.name} visa guide
              </Link>
            </li>
            {otherTypes.map((t) => (
              <li key={t.slug}>
                <Link href={t.href} className="underline underline-offset-4 hover:text-accent-strong">
                  {t.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href={routes.visaFinder()} className="underline underline-offset-4 hover:text-accent-strong">
                Visa Finder
              </Link>
            </li>
          </ul>
        </Container>
      </Section>

      {tours.length > 0 && (
        <Section tone="surface" aria-labelledby="tours-title">
          <Container size="wide">
            <SectionHeading id="tours-title" eyebrow="Travel there" title={`${country.name} tours`} />
            <TourGrid tours={tours} columns={3} className="mt-block" />
          </Container>
        </Section>
      )}

      <JournalPreview id="guides-title" eyebrow="Travel Journal" title={`${country.name} travel guides`} articles={guides} />

      <CTASection
        id="cta-title"
        eyebrow="Visa assistance"
        title={`Applying for a ${country.name} ${type.name.toLowerCase()}?`}
        description="Let our travel team help you understand the process and prepare your application."
        primary={{ label: "Get visa assistance", href: helpHref }}
        tone="ink"
      />

      {!guide.isSample && (
        <JsonLd
          data={[
            visaServiceSchema({ name: `${country.name} ${type.name} assistance`, path: type.href, country: country.name }),
            ...(faqSchema(type.faqs) ? [faqSchema(type.faqs)!] : []),
          ]}
        />
      )}
    </>
  );
}
