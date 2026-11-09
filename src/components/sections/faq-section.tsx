import type { FaqItem } from "@/types/content";
import { Section, type SectionTone } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { FaqAccordion } from "@/components/ui/faq-accordion";
import { JsonLd } from "@/lib/seo/json-ld";
import { faqSchema } from "@/lib/seo/schema";
import { routes } from "@/lib/routes";

/**
 * FAQ block used on the homepage, destination and package pages.
 * Answers are always in the HTML (crawlable). FAQPage schema is emitted only
 * when every item is real published content (faqSchema returns null for samples).
 */
export function FaqSection({
  id,
  items,
  title = "Questions, answered.",
  eyebrow = "FAQ",
  tone = "sand",
  showAllLink = true,
}: {
  id: string;
  items: FaqItem[];
  title?: string;
  eyebrow?: string;
  tone?: SectionTone;
  showAllLink?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <Section tone={tone} aria-labelledby={id}>
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <SectionHeading id={id} eyebrow={eyebrow} title={title} />
            {showAllLink && (
              <ButtonLink href={routes.faq()} variant="ghost" className="mt-6">
                All questions
                <ArrowIcon />
              </ButtonLink>
            )}
          </div>
          <FaqAccordion items={items} defaultOpenId={items[0].id} className="lg:col-span-8" />
        </div>
      </Container>
      <JsonLd data={faqSchema(items)} />
    </Section>
  );
}
