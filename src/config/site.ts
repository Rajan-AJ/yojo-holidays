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
  logo: "/brand/yojo-holidays-logo.jpg",
} as const;

export type NavItem = { label: string; href: string };

/** Desktop primary navigation, per the brief. Kept deliberately short. */
export const mainNav: NavItem[] = [
  { label: "Destinations", href: "/destinations/" },
  { label: "Tours", href: "/tours/" },
  { label: "Visa Assistance", href: "/visa/" },
  { label: "Travel Journal", href: "/travel-guide/" },
  { label: "About", href: "/about/" },
];

export const primaryCta: NavItem = { label: "Plan a Trip", href: "/plan-your-trip/" };

export const footerNav: { heading: string; links: NavItem[] }[] = [
  {
    heading: "Tours",
    links: [
      { label: "Domestic Tours", href: "/domestic-tours/" },
      { label: "International Tours", href: "/international-tours/" },
      { label: "Family Tours", href: "/tours/family/" },
      { label: "Honeymoon Tours", href: "/tours/honeymoon/" },
      { label: "Group Tours", href: "/tours/group/" },
      { label: "Custom Trips", href: "/plan-your-trip/" },
    ],
  },
  {
    heading: "Destinations",
    links: [
      { label: "India", href: "/domestic-tours/" },
      { label: "Asia", href: "/destinations/asia/" },
      { label: "Middle East", href: "/destinations/middle-east/" },
      { label: "Europe", href: "/destinations/europe/" },
      { label: "All Destinations", href: "/destinations/" },
    ],
  },
  {
    heading: "Visa & Help",
    links: [
      { label: "Visa Finder", href: "/visa/" },
      { label: "Travel Journal", href: "/travel-guide/" },
      { label: "FAQs", href: "/faq/" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about/" },
      { label: "Contact", href: "/contact/" },
      { label: "Plan Your Trip", href: "/plan-your-trip/" },
    ],
  },
];

/** True while a value is still an unreplaced development placeholder. */
export function isPlaceholder(value: string) {
  return value.startsWith("[") && value.endsWith("]");
}
