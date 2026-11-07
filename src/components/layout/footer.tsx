import Link from "next/link";
import { footerNav, isPlaceholder, siteConfig } from "@/config/site";
import { Container } from "@/components/ui/container";
import { Wordmark } from "./wordmark";

function ContactLine({ label, value, href }: { label: string; value: string; href?: string }) {
  // Placeholders render as plain text so they are never clickable dead links.
  const content =
    href && !isPlaceholder(value) ? (
      <a href={href} className="hover:text-ink">
        {value}
      </a>
    ) : (
      value
    );
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>{content}</dd>
    </div>
  );
}

export function Footer() {
  const { contact } = siteConfig;

  return (
    <footer className="border-t border-line bg-canvas">
      <Container className="grid gap-14 py-20 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Wordmark />
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-muted">
            {siteConfig.description}
          </p>
          <dl className="mt-8 space-y-2 text-sm text-muted">
            <ContactLine label="Phone" value={contact.phone} href={`tel:${contact.phone}`} />
            <ContactLine label="Email" value={contact.email} href={`mailto:${contact.email}`} />
            <ContactLine label="Address" value={contact.address} />
          </dl>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:col-span-8">
          {footerNav.map((group) => (
            <div key={group.heading}>
              <h2 className="font-sans text-eyebrow uppercase text-muted">{group.heading}</h2>
              <ul className="mt-5 space-y-3 text-sm">
                {group.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href} className="hover:text-accent-strong">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </Container>

      <Container>
        <div className="flex flex-col gap-3 border-t border-line py-8 text-xs text-muted sm:flex-row sm:justify-between">
          <p>
          © <CopyrightYear /> {siteConfig.name}. All rights reserved.
        </p>
          <p>{siteConfig.tagline}</p>
        </div>
      </Container>
    </footer>
  );
}

async function CopyrightYear() {
  "use cache";
  return new Date().getFullYear();
}
