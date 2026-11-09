/**
 * View models the UI renders.
 *
 * They mirror the Prisma models (prisma/schema.prisma) but only carry what a
 * component needs, already resolved (image URL + alt, href). The query layer
 * (src/server/queries, Phase 3+) maps database rows onto these, so components
 * never import Prisma and work the same with placeholder or real data.
 *
 * Enum unions are duplicated as string literals on purpose: importing the
 * generated Prisma enums would drag server code into client bundles.
 */

export type TourScope = "DOMESTIC" | "INTERNATIONAL";

export type GuideCategory =
  | "DESTINATION_GUIDE"
  | "VISA_GUIDE"
  | "TRAVEL_TIPS"
  | "THINGS_TO_DO"
  | "BEST_TIME_TO_VISIT"
  | "TRAVEL_COST_GUIDE"
  | "TRAVEL_FAQ";

/** Maps to Media. `alt` is required: every image needs a description. */
export type ImageAsset = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  credit?: string;
  blurDataURL?: string;
};

/** Marks development data so it can never be mistaken for, or published as, real content. */
type Sampleable = { isSample?: boolean };

export type DestinationSummary = Sampleable & {
  id: string;
  name: string;
  /** Country or region line, e.g. "Southeast Asia". */
  region?: string;
  tagline?: string;
  scope: TourScope;
  href: string;
  image: ImageAsset;
  /** Number of published tours here, when known. */
  tourCount?: number;
};

export type Price = {
  /** Per person. null means "price on request". */
  amount: number | null;
  /** ISO 4217, e.g. "INR". */
  currency: string;
  note?: string;
};

export type TourSummary = Sampleable & {
  id: string;
  name: string;
  href: string;
  destination: string;
  durationDays: number;
  durationNights: number;
  summary?: string;
  categories: string[];
  price: Price;
  image: ImageAsset;
};

export type TravelCategory = {
  id: string;
  name: string;
  description: string;
  href: string;
  image?: ImageAsset;
};

export type ItineraryDayView = {
  dayNumber: number;
  title: string;
  location?: string;
  description: string;
  image: ImageAsset;
};

export type ReviewView = Sampleable & {
  id: string;
  title?: string;
  body: string;
  travellerName: string;
  destination?: string;
  /** Year travelled. Shown instead of a fake precise date. */
  travelYear?: number;
  /** 1 to 5. null when not provided (and always for samples). */
  rating: number | null;
  /** Staff confirmed this person travelled with us. */
  verified?: boolean;
  image?: ImageAsset;
};

export type ArticleSummary = Sampleable & {
  id: string;
  title: string;
  href: string;
  category: GuideCategory;
  excerpt?: string;
  /** ISO date string. Omit when unknown; never invent one. */
  publishedAt?: string;
  image: ImageAsset;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  /** Development placeholder. FAQPage schema is never emitted for these. */
  isSample?: boolean;
};

export type VisaDestinationOption = {
  /** VisaCountry slug, used to build /visa/{slug}/. */
  slug: string;
  name: string;
};

// ---------------------------------------------------------------------------
// Detail view models (returned by src/server/repositories, used by later phases)
// ---------------------------------------------------------------------------

/** Resolved SEO overrides from SeoMeta. Absent fields fall back to the content. */
export type SeoView = {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: ImageAsset;
  noIndex: boolean;
};

export type LinkRef = { name: string; href: string };

export type CountryDetail = {
  id: string;
  name: string;
  slug: string;
  region: { name: string; slug: string };
  shortDescription?: string;
  description?: string;
  image?: ImageAsset;
  destinations: DestinationSummary[];
  /** Present when the country has published visa information. */
  visaHref?: string;
  seo: SeoView;
};

/** Short visa block shown on destination and package pages. */
export type VisaSummary = {
  countryName: string;
  /** Default passport the guide is written for, e.g. "Indian". */
  passportLabel?: string;
  href: string;
  shortAnswer?: string;
  types: { name: string; processingTime?: string; requirements: string[] }[];
  isSample: boolean;
};

export type DestinationDetail = Omit<DestinationSummary, "image"> & {
  slug: string;
  type: "COUNTRY" | "REGION" | "CITY" | "PLACE";
  image?: ImageAsset;
  description?: string;
  bestTimeToVisit?: string;
  averageDuration?: string;
  country: LinkRef & { slug: string };
  /** Region the country sits in, e.g. "Southeast Asia". */
  regionName: string;
  /** Parent destination chain, outermost first (Vietnam for Hanoi). */
  ancestors: LinkRef[];
  /** Cities and places inside this destination ("things to experience"). */
  places: DestinationSummary[];
  gallery: ImageAsset[];
  related: DestinationSummary[];
  tourCount: number;
  visa?: VisaSummary;
  seo: SeoView;
};

export type ItineraryDayDetail = {
  dayNumber: number;
  title: string;
  description?: string;
  morning?: string;
  afternoon?: string;
  evening?: string;
  meals: { breakfast: boolean; lunch: boolean; dinner: boolean };
  location?: string;
  /** Hotel name, or a note such as "Overnight on the cruise". */
  accommodation?: string;
  image?: ImageAsset;
};

export type PackageHotelView = {
  name: string;
  city?: string;
  nights: number;
  starRating?: number;
  roomType?: string;
  mealPlan?: string;
  website?: string;
  isOption: boolean;
};

export type ListItem = { title: string; description?: string };

export type TourPackageDetail = Omit<TourSummary, "image"> & {
  slug: string;
  image?: ImageAsset;
  description?: string;
  importantInfo?: string;
  destinationRef: LinkRef & { slug: string; scope: TourScope };
  /** Parent destination chain of the package's destination, outermost first. */
  destinationAncestors: LinkRef[];
  /** Slug of the outermost published destination (Vietnam for a Hanoi tour). */
  topDestinationSlug: string;
  categoryRefs: (LinkRef & { slug: string })[];
  highlights: (ListItem & { icon?: string })[];
  itinerary: ItineraryDayDetail[];
  hotels: PackageHotelView[];
  inclusions: ListItem[];
  exclusions: ListItem[];
  gallery: ImageAsset[];
  visa?: VisaSummary;
  publishedAt?: string;
  seo: SeoView;
};

export type TourCategoryDetail = {
  name: string;
  slug: string;
  href: string;
  description?: string;
  image?: ImageAsset;
  seo: SeoView;
};

/** Filters for tour listings. All optional; values come from the URL. */
export type TourFilters = {
  scope?: TourScope;
  /** Country slug (all destinations in it). Used for visa-page related tours. */
  country?: string;
  category?: string;
  destination?: string;
  duration?: "short" | "week" | "long";
  maxPrice?: number;
};

export type VisaPurpose = "TOURISM" | "BUSINESS" | "TRANSIT" | "FAMILY_VISIT";
export type VisaKind = "VISA_FREE" | "VISA_ON_ARRIVAL" | "E_VISA" | "ETA" | "VISA_REQUIRED";

/** The passport a visa guide is written for. */
export type PassportRef = { isoCode: string; name: string; demonym?: string };

export type VisaTypeView = {
  name: string;
  slug: string;
  purpose: VisaPurpose;
  /** null = not verified / not entered. Never guessed. */
  kind: VisaKind | null;
  description?: string;
  eligibility?: string;
  /** Shown only when the guide is verified (see VisaCountryDetail.verified). */
  processingTime?: string;
  validity?: string;
  maxStay?: string;
  entries?: string;
  /** Government fee. Only present when verified; otherwise amount is null. */
  fee: Price;
  feeNotes?: string;
  importantNotes?: string;
  requirements: (ListItem & { required: boolean })[];
  steps: ListItem[];
  faqs: FaqItem[];
  /** Has enough content for its own page (/visa/{country}/{type}/). */
  hasOwnPage: boolean;
  href: string;
};

export type VisaCountryDetail = {
  country: LinkRef & { slug: string; isoCode: string };
  passport: PassportRef;
  shortAnswer?: string;
  description?: string;
  importantNotes?: string;
  image?: ImageAsset;
  /**
   * The guide has been checked against an official source. Fees and
   * processing times are only shown when this is true.
   */
  verified: boolean;
  /** ISO date the information was last checked against the official source. */
  lastVerifiedAt?: string;
  sourceUrl?: string;
  visaTypes: VisaTypeView[];
  faqs: FaqItem[];
  /** The country's own destination page (for "View Vietnam tours"). */
  destination?: LinkRef;
  isSample: boolean;
  seo: SeoView;
};

/** One visa guide in lists and in the Visa Finder. */
export type VisaGuideSummary = {
  countrySlug: string;
  countryName: string;
  href: string;
  passportIso: string;
  shortAnswer?: string;
  image?: ImageAsset;
  purposes: VisaPurpose[];
  typeNames: string[];
  isSample: boolean;
};

export type TravelGuideDetail = Omit<ArticleSummary, "image"> & {
  slug: string;
  image?: ImageAsset;
  /** Markdown. Rendered by the Journal UI (later phase). */
  content: string;
  author?: { name: string; bio?: string };
  destination?: LinkRef;
  country?: LinkRef;
  updatedAt: string;
  faqs: FaqItem[];
  related: ArticleSummary[];
  seo: SeoView;
};
