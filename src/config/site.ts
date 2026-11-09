import { routes } from "@/lib/routes";

/**
 * Business identity and navigation.
 *
 * Values in [SQUARE BRACKETS] are development placeholders and MUST be replaced
 * with confirmed client details before launch. Do not invent real-looking
 * phone numbers, addresses or claims. (Phase 11 moves these into SiteSetting
 * so they can be edited from the admin dashboard.)
 */
export const siteConfig = {
  name: "Yojo Holidays", // from the client logo
  tagline: "Your gateway to the world", // from the client logo
  description:
    "Domestic and international tour packages, custom trips and visa assistance, planned around how you like to travel.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_IN",
  contact: {
    phone: "[CLIENT PHONE]",
    whatsapp: "[CLIENT WHATSAPP]",
    email: "[CLIENT EMAIL]",
    address: "[CLIENT ADDRESS]",
  },
  /** Profile URLs. Placeholders render as plain text, never as links. */
  social: [
    { label: "Instagram", href: "[CLIENT INSTAGRAM URL]" },
    { label: "Facebook", href: "[CLIENT FACEBOOK URL]" },
    { label: "YouTube", href: "[CLIENT YOUTUBE URL]" },
  ],
  logo: "/brand/yojo-holidays-logo.jpg",
} as const;

/**
 * Visa guides are written per passport. The site's audience holds Indian
 * passports, so /visa/{country}/ shows the guide for this passport. Adding a
 * passport later is a data change (new VisaCountry rows), not a code change.
 */
export const visaConfig = {
  defaultPassportIso: "IN",
} as const;

export type NavItem = { label: string; href: string };

/** Desktop primary navigation, per the brief. Kept deliberately short. */
export const mainNav: NavItem[] = [
  { label: "Tours", href: routes.tours() },
  { label: "Destinations", href: routes.destinations() },
  { label: "Visa", href: routes.visa() },
  { label: "Travel Journal", href: routes.journal() },
  { label: "About", href: routes.about() },
  { label: "Contact", href: routes.contact() },
];

export const primaryCta: NavItem = { label: "Plan Your Trip", href: routes.planTrip() };

/** Only links a traveller would actually use. No SEO link-stuffing. */
export const footerNav: { heading: string; links: NavItem[] }[] = [
  {
    heading: "Tours",
    links: [
      { label: "Domestic Tours", href: routes.scope("DOMESTIC") },
      { label: "International Tours", href: routes.scope("INTERNATIONAL") },
      { label: "Family Holidays", href: routes.tourCategory("family") },
      { label: "Honeymoons", href: routes.tourCategory("honeymoon") },
      { label: "Group Tours", href: routes.tourCategory("group") },
    ],
  },
  {
    heading: "Destinations",
    links: [
      { label: "Vietnam", href: routes.destination("INTERNATIONAL", "vietnam") },
      { label: "Japan", href: routes.destination("INTERNATIONAL", "japan") },
      { label: "Dubai", href: routes.destination("INTERNATIONAL", "dubai") },
      { label: "Singapore", href: routes.destination("INTERNATIONAL", "singapore") },
      { label: "All destinations", href: routes.destinations() },
    ],
  },
  {
    heading: "Visa & Journal",
    links: [
      { label: "Visa Assistance", href: routes.visa() },
      { label: "Visa Guides", href: routes.journalCategory("VISA_GUIDE") },
      { label: "Destination Guides", href: routes.journalCategory("DESTINATION_GUIDE") },
      { label: "Travel Journal", href: routes.journal() },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: routes.about() },
      { label: "Contact", href: routes.contact() },
      { label: "Plan Your Trip", href: routes.planTrip() },
      { label: "FAQs", href: routes.faq() },
    ],
  },
];

export const legalNav: NavItem[] = [
  { label: "Privacy Policy", href: "/privacy-policy/" },
  { label: "Terms & Conditions", href: "/terms/" },
];

/** True while a value is still an unreplaced development placeholder. */
export function isPlaceholder(value: string) {
  return value.startsWith("[") && value.endsWith("]");
}
