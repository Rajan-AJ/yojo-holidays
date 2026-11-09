import Link from "next/link";
import { footerNav, isPlaceholder, legalNav, primaryCta, siteConfig } from "@/config/site";
import { Container } from "@/components/ui/container";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { Wordmark } from "./wordmark";

/** Renders a link only once the value is real; placeholders stay plain text. */
function MaybeLink({ value, href, external }: { value: string; href?: string; external?: boolean }) {
  if (!href || isPlaceholder(value) || isPlaceholder(href)) return <>{value}</>;
  return (
    <a
      href={href}
      className="transition-colors hover:text-white"
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {value}
    </a>
  );
}

export function Footer() {
  const { contact, social } = siteConfig;

  return (
    <footer className="on-dark bg-ink text-canvas">
      <Container size="wide">
        {/* Intro + CTA */}
        <div className="grid gap-10 border-b border-line-inverse py-section-sm lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Wordmark />
            <p className="mt-8 max-w-xl font-serif text-h3 text-canvas/90">
              {siteConfig.description}
            </p>
          </div>
          <div className="lg:col-span-5 lg:justify-self-end">
            <ButtonLink href={primaryCta.href} variant="inverse" size="lg">
              {primaryCta.label}
              <ArrowIcon />
            </ButtonLink>
          </div>
        </div>

        {/* Links + contact */}
        <div className="grid gap-12 py-16 lg:grid-cols-12">
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:col-span-8">
            {footerNav.map((group) => (
              <div key={group.heading}>
                <h2 className="eyebrow text-canvas/60">{group.heading}</h2>
                <ul className="mt-5 space-y-3 text-body-sm">
                  {group.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link href={link.href} className="text-canvas/85 transition-colors hover:text-accent">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1 lg:pl-10">
            <div>
              <h2 className="eyebrow text-canvas/60">Contact</h2>
              <address className="mt-5 space-y-3 text-body-sm not-italic text-canvas/85">
                <p>
                  <span className="sr-only">Phone: </span>
                  <MaybeLink value={contact.phone} href={`tel:${contact.phone}`} />
                </p>
                <p>
                  <span className="sr-only">Email: </span>
                  <MaybeLink value={contact.email} href={`mailto:${contact.email}`} />
                </p>
                <p>
                  <span className="sr-only">Address: </span>
                  {contact.address}
                </p>
              </address>
            </div>
            <div>
              <h2 className="eyebrow text-canvas/60">Follow</h2>
              <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-body-sm text-canvas/85">
                {social.map((item) => (
                  <li key={item.label}>
                    <MaybeLink value={item.label} href={item.href} external />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Legal */}
        <div className="flex flex-col gap-4 border-t border-line-inverse py-8 text-caption text-canvas/60 md:flex-row md:items-center md:justify-between">
          <p>
            © <CopyrightYear /> {siteConfig.name}. All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legalNav.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-canvas">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}

async function CopyrightYear() {
  "use cache";
  return new Date().getFullYear();
}
