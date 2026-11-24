import Link from "next/link";
import { footerNav, isPlaceholder, legalNav, siteConfig } from "@/config/site";
import { getSiteSettings } from "@/server/queries";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";
import { Wordmark } from "./wordmark";

/** Renders a link only once the value is real; placeholders stay plain text. */
function MaybeLink({ value, href, external }: { value: string; href?: string; external?: boolean }) {
  if (!href || isPlaceholder(value) || isPlaceholder(href)) return <>{value}</>;
  return (
    <a
      href={href}
      className="inline-flex min-h-11 items-center transition-colors hover:text-canvas lg:min-h-0"
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {value}
    </a>
  );
}

const socialGlyphs: Record<string, string> = { Instagram: "IG", Facebook: "FB", YouTube: "YT" };

/** Small circular social icon; falls back to a muted, non-interactive dot for placeholder URLs. */
function SocialLink({ item }: { item: { label: string; href: string } }) {
  const glyph = socialGlyphs[item.label] ?? item.label.charAt(0).toUpperCase();
  const className =
    "flex size-9 items-center justify-center rounded-full border border-line-inverse text-xs font-semibold tracking-wide text-canvas/70 transition-colors";

  if (isPlaceholder(item.href)) {
    return (
      <span className={cn(className, "opacity-40")} aria-hidden="true">
        {glyph}
      </span>
    );
  }
  return (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={item.label}
      className={cn(className, "hover:border-canvas/40 hover:text-canvas")}
    >
      <span aria-hidden="true">{glyph}</span>
    </a>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)}>
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106a1.125 1.125 0 0 0-1.173.417l-.97 1.293a1.125 1.125 0 0 1-1.21.38 12.035 12.035 0 0 1-7.143-7.143 1.125 1.125 0 0 1 .38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
      />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)}>
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
      />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)}>
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
    </svg>
  );
}

const platformLabel: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", youtube: "YouTube", linkedin: "LinkedIn", x: "X", pinterest: "Pinterest" };

/** Contact details and social links come from the CMS (Website settings); config placeholders until filled in. */
export async function Footer() {
  const settings = await getSiteSettings();
  const a = settings?.address;
  const contact = {
    phone: settings?.phone ?? siteConfig.contact.phone,
    email: settings?.email ?? siteConfig.contact.email,
    address: a ? [a.line1, a.line2, a.city, a.state, a.postalCode].filter(Boolean).join(", ") : siteConfig.contact.address,
  };
  const social = settings?.social.length
    ? settings.social.map((s) => ({ label: platformLabel[s.platform] ?? s.platform, href: s.url }))
    : siteConfig.social;

  return (
    <footer className="on-dark bg-ink text-canvas">
      <Container size="wide">
        <div className="grid gap-10 py-14 lg:grid-cols-12">
          {/* Brand + contact */}
          <div className="lg:col-span-4">
            <Wordmark onDark size="md" />
            <p className="mt-5 max-w-xs text-body-sm text-canvas/70">{siteConfig.description}</p>
            <address className="mt-6 space-y-3 text-body-sm not-italic text-canvas/85">
              <p className="flex items-center gap-2.5">
                <PhoneIcon className="text-canvas/50" />
                <span className="sr-only">Phone: </span>
                <MaybeLink value={contact.phone} href={`tel:${contact.phone}`} />
              </p>
              <p className="flex items-center gap-2.5">
                <MailIcon className="text-canvas/50" />
                <span className="sr-only">Email: </span>
                <MaybeLink value={contact.email} href={`mailto:${contact.email}`} />
              </p>
              <p className="flex items-start gap-2.5">
                <PinIcon className="mt-0.5 text-canvas/50" />
                <span>
                  <span className="sr-only">Address: </span>
                  {contact.address}
                </span>
              </p>
            </address>
            <ul className="mt-6 flex gap-2.5">
              {social.map((item) => (
                <li key={item.label}>
                  <SocialLink item={item} />
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4 lg:col-span-8">
            {footerNav.map((group) => (
              <div key={group.heading}>
                <h2 className="eyebrow text-canvas/50">{group.heading}</h2>
                {/* Touch screens get 44px rows; desktop keeps the tighter list. */}
                <ul className="mt-2 text-body-sm lg:mt-4 lg:space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="inline-flex min-h-11 items-center text-canvas/80 transition-colors hover:text-accent lg:min-h-0"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Legal */}
        <div className="flex flex-col gap-3 border-t border-line-inverse py-6 text-caption text-canvas/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CopyrightYear /> {siteConfig.name}. All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-6">
            {legalNav.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center transition-colors hover:text-canvas lg:min-h-0"
                >
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
