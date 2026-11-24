import type { PageBlock } from "@/server/repositories/pages";
import type { FaqItem } from "@/types/content";
import { getFeaturedDestinations, getFeaturedPackages, getPublishedReviews } from "@/server/queries";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { Prose } from "@/components/content/prose";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { TourGrid } from "@/components/sections/tour-grid";
import { DestinationGrid } from "@/components/sections/destination-grid";
import { FaqSection } from "@/components/sections/faq-section";
import { CTASection } from "@/components/sections/cta-section";
import { TravellerStories } from "@/components/home/traveller-stories";
import { Reveal } from "@/components/motion/reveal";

/** Renders CMS page blocks in order. Blocks with nothing to show render nothing. */
export async function PageBlocks({ blocks, faqs }: { blocks: PageBlock[]; faqs: FaqItem[] }) {
  const needs = new Set(blocks.map((b) => b.type));
  const [tours, destinations, reviews] = await Promise.all([
    needs.has("tours") ? getFeaturedPackages(6) : [],
    needs.has("destinations") ? getFeaturedDestinations(8) : [],
    needs.has("testimonials") ? getPublishedReviews({ limit: 6 }) : [],
  ]);

  return blocks.map((b, i) => {
    const id = `block-${i}`;
    switch (b.type) {
      case "rich_text":
        return (
          <Section key={i} aria-labelledby={b.heading ? id : undefined} spacing="compact">
            <Container size="narrow">
              {b.heading && (
                <SectionHeading id={id} eyebrow={b.eyebrow} title={b.heading} />
              )}
              <Prose text={b.body} className={b.heading ? "mt-8" : undefined} />
            </Container>
          </Section>
        );
      case "image_text":
        return (
          <Section key={i} aria-labelledby={b.heading ? id : undefined}>
            <Container>
              <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
                {b.image && (
                  <Reveal variant="imageReveal" className={i % 2 ? "lg:order-2" : undefined}>
                    <ResponsiveImage image={b.image} aspect="portrait" sizes="(min-width: 1024px) 45vw, 100vw" className="rounded-3xl" />
                  </Reveal>
                )}
                <div>
                  {b.heading && <SectionHeading id={id} eyebrow={b.eyebrow} title={b.heading} />}
                  <Prose text={b.body} className="mt-8" />
                  {b.button && (
                    <ButtonLink href={b.button.href} className="mt-10">
                      {b.button.label}
                      <ArrowIcon />
                    </ButtonLink>
                  )}
                </div>
              </div>
            </Container>
          </Section>
        );
      case "stats":
        return (
          <Section key={i} tone="sand" aria-labelledby={b.heading ? id : undefined} spacing="compact">
            <Container>
              {b.heading && <SectionHeading id={id} eyebrow={b.eyebrow} title={b.heading} />}
              <dl className="mt-block grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
                {b.items.map((s) => (
                  <div key={s.label} className="border-t border-ink/15 pt-6">
                    <dd className="font-display text-display leading-none">{s.value}</dd>
                    <dt className="mt-3 text-body text-muted">{s.label}</dt>
                  </div>
                ))}
              </dl>
            </Container>
          </Section>
        );
      case "cta":
        return b.button ? (
          <CTASection
            key={i}
            id={id}
            eyebrow={b.eyebrow}
            title={b.heading ?? "Ready when you are."}
            primary={{ label: b.button.label, href: b.button.href }}
          />
        ) : null;
      case "faq":
        return <FaqSection key={i} id={id} title={b.heading ?? "Frequently asked questions"} eyebrow={b.eyebrow} items={faqs} showAllLink={false} />;
      case "tours":
        return tours.length ? (
          <Section key={i} tone="surface" aria-labelledby={id}>
            <Container size="wide">
              <SectionHeading id={id} eyebrow={b.eyebrow ?? "Tours"} title={b.heading ?? "Handpicked journeys"} />
              <TourGrid tours={tours} columns={3} className="mt-block" />
            </Container>
          </Section>
        ) : null;
      case "destinations":
        return destinations.length ? (
          <Section key={i} aria-labelledby={id}>
            <Container size="wide">
              <SectionHeading id={id} eyebrow={b.eyebrow ?? "Destinations"} title={b.heading ?? "Where to next?"} />
              <div className="mt-block">
                <DestinationGrid destinations={destinations} />
              </div>
            </Container>
          </Section>
        ) : null;
      case "testimonials":
        return <TravellerStories key={i} reviews={reviews} id={id} title={b.heading ?? "What travellers say"} />;
    }
  });
}
