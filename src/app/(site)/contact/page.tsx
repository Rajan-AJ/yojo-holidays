import { getSiteSettings } from "@/server/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { listingTrail } from "@/lib/seo/breadcrumbs";
import { routes } from "@/lib/routes";
import { siteConfig } from "@/config/site";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { PageHero } from "@/components/sections/page-hero";
import { EnquiryForm } from "@/components/forms/enquiry-form";

export const metadata = buildMetadata({
  title: "Contact Us",
  description: `Call, WhatsApp or email ${siteConfig.name}, or send us a message and we'll get back to you.`,
  path: routes.contact(),
});

/** Placeholder values ("[CLIENT PHONE]") are shown as text and never linked. */
const isPlaceholder = (v?: string) => !v || v.startsWith("[");

export default async function Page() {
  const s = await getSiteSettings();
  const phone = s?.phone ?? siteConfig.contact.phone;
  const whatsapp = s?.whatsapp ?? siteConfig.contact.whatsapp;
  const email = s?.email ?? siteConfig.contact.email;
  const address = s?.address
    ? [s.address.line1, s.address.line2, s.address.city, s.address.state, s.address.postalCode].filter(Boolean).join(", ")
    : siteConfig.contact.address;

  const rows: { label: string; value: string; href?: string }[] = [
    { label: "Phone", value: phone, href: isPlaceholder(phone) ? undefined : `tel:${phone.replace(/\s/g, "")}` },
    {
      label: "WhatsApp",
      value: whatsapp,
      href: isPlaceholder(whatsapp) ? undefined : `https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`,
    },
    { label: "Email", value: email, href: isPlaceholder(email) ? undefined : `mailto:${email}` },
    { label: "Office", value: address, href: s?.googleMapsUrl },
  ];

  return (
    <>
      <PageHero
        title="Contact us"
        eyebrow="We're here to help"
        intro="Planning a trip, changing one, or need help with a visa? Get in touch whichever way suits you."
        breadcrumbs={listingTrail({ name: "Contact", href: routes.contact() })}
      />
      <Section spacing="compact">
        <Container>
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className="font-display text-h2">Talk to us</h2>
              <dl className="mt-8 divide-y divide-line border-y border-line">
                {rows.map((r) => (
                  <div key={r.label} className="grid grid-cols-[7rem_1fr] gap-4 py-5">
                    <dt className="text-body-sm text-muted">{r.label}</dt>
                    <dd className="text-body">
                      {r.href ? (
                        <a
                          href={r.href}
                          className="underline decoration-line-strong underline-offset-4 hover:decoration-ink"
                          {...(r.href.startsWith("http") && { target: "_blank", rel: "noopener noreferrer" })}
                        >
                          {r.value}
                        </a>
                      ) : (
                        r.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <h2 className="font-display text-h2">Send a message</h2>
              <div className="mt-8">
                <EnquiryForm compact defaults={{ enquiryType: "general" }} formPath={routes.contact()} />
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
