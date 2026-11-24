import { getGeneralFaqs } from "@/server/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { listingTrail } from "@/lib/seo/breadcrumbs";
import { JsonLd } from "@/lib/seo/json-ld";
import { faqSchema } from "@/lib/seo/schema";
import { routes } from "@/lib/routes";
import { PageHero } from "@/components/sections/page-hero";
import { FaqSection } from "@/components/sections/faq-section";
import { CTASection } from "@/components/sections/cta-section";

export const metadata = buildMetadata({
  title: "Frequently Asked Questions",
  description: "Answers about booking, payments, customising packages and visa help.",
  path: routes.faq(),
});

export default async function Page() {
  const faqs = await getGeneralFaqs();
  return (
    <>
      <PageHero
        title="Frequently asked questions"
        eyebrow="Help"
        intro="Booking, payments, changes and visas: the questions travellers ask us most."
        breadcrumbs={listingTrail({ name: "FAQ", href: routes.faq() })}
      />
      <FaqSection id="faq-title" title="Your questions, answered" items={faqs} showAllLink={false} tone="canvas" />
      <CTASection
        id="cta-title"
        eyebrow="Still wondering?"
        title="Ask us anything."
        description="Our travel team is happy to help, whether you're ready to book or just exploring ideas."
        primary={{ label: "Contact us", href: routes.contact() }}
        secondary={{ label: "Plan your trip", href: routes.planTrip() }}
      />
      <JsonLd data={faqSchema(faqs)} />
    </>
  );
}
