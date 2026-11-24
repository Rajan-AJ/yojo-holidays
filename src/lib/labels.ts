import type { TourScope } from "@/types/content";

/** Human labels for database enums. */
export const scopeLabel: Record<TourScope, string> = {
  DOMESTIC: "Domestic Travel",
  INTERNATIONAL: "International Travel",
};

/** Page titles for the scope listings, also used in breadcrumbs. */
export const scopeTitle: Record<TourScope, string> = {
  DOMESTIC: "Domestic Tours",
  INTERNATIONAL: "International Tours",
};

export const visaPurposeLabel: Record<"TOURISM" | "BUSINESS" | "TRANSIT" | "FAMILY_VISIT", string> = {
  TOURISM: "Tourism",
  BUSINESS: "Business",
  TRANSIT: "Transit",
  FAMILY_VISIT: "Visiting family or friends",
};

/** Plain-language answer to "Do I need a visa?" for each kind of permission. */
export const visaKindLabel: Record<"VISA_FREE" | "VISA_ON_ARRIVAL" | "E_VISA" | "ETA" | "VISA_REQUIRED", string> = {
  VISA_FREE: "No visa needed",
  VISA_ON_ARRIVAL: "Visa on arrival",
  E_VISA: "e-Visa (apply online)",
  ETA: "Electronic travel authorisation",
  VISA_REQUIRED: "Visa required before travel",
};

export const departureStatusLabel: Record<"open" | "filling_fast" | "sold_out" | "closed", string> = {
  open: "Available",
  filling_fast: "Filling fast",
  sold_out: "Sold out",
  closed: "Closed",
};

export const priceBasisLabel: Record<"per_person_twin_sharing" | "per_person" | "per_couple" | "per_group", string> = {
  per_person_twin_sharing: "per person, twin sharing",
  per_person: "per person",
  per_couple: "per couple",
  per_group: "per group",
};

export const monthLabel = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
