import type { FaqItem } from "@/types/content";
import { JsonLd } from "@/lib/seo/json-ld";
import { faqSchema } from "@/lib/seo/schema";
import { routes } from "@/lib/routes";
import { HomeFaqAccordion } from "./home-faq-accordion";
import { Arrow, HomeButton, HomeHeading, HomeSection } from "./ui";

/** Centred FAQ card. FAQPage schema only for real content (faqSchema handles samples). */
export function HomeFaq({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;

  return (
    <HomeSection aria-labelledby="faq-title">
      <HomeHeading
        id="faq-title"
        eyebrow="Got questions?"
        title="Frequently asked"
        accent="questions"
        description="Everything you need to know before booking your next trip with us."
        align="center"
      />
      <div className="mx-auto max-w-3xl rounded-2xl bg-white px-6 shadow-(--shadow-card)">
        <HomeFaqAccordion items={items} />
      </div>
      <div className="mt-10 text-center">
        <p className="mb-3 text-[14px] text-gray-500">Still have questions?</p>
        <HomeButton href={routes.contact()} variant="navy">
          Talk to our team
          <Arrow />
        </HomeButton>
      </div>
      <JsonLd data={faqSchema(items)} />
    </HomeSection>
  );
}
