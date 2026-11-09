import type { GuideCategory, TourScope } from "@/types/content";

/** Human labels for database enums. */
export const guideCategoryLabel: Record<GuideCategory, string> = {
  DESTINATION_GUIDE: "Destination Guide",
  VISA_GUIDE: "Visa Guide",
  TRAVEL_TIPS: "Travel Tips",
  THINGS_TO_DO: "Things To Do",
  BEST_TIME_TO_VISIT: "Best Time To Visit",
  TRAVEL_COST_GUIDE: "Travel Costs",
  TRAVEL_FAQ: "Travel FAQ",
};

/** Plural forms for navigation ("Visa Guides"), where the singular reads oddly. */
export const guideCategoryNavLabel: Record<GuideCategory, string> = {
  DESTINATION_GUIDE: "Destination Guides",
  VISA_GUIDE: "Visa Guides",
  TRAVEL_TIPS: "Travel Tips",
  THINGS_TO_DO: "Things To Do",
  BEST_TIME_TO_VISIT: "Best Time To Visit",
  TRAVEL_COST_GUIDE: "Travel Costs",
  TRAVEL_FAQ: "Travel FAQs",
};

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
