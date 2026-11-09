import { z } from "zod";
import {
  calendarDate,
  currency,
  httpUrl,
  optionalText,
  price,
  publishStatus,
  rating,
  slug,
  sortOrder,
  starRating,
  text,
} from "./common";

/**
 * Input schemas for content entities. Used by the seed today and by the
 * admin's server actions later, so both go through identical rules.
 */

export const tourScope = z.enum(["DOMESTIC", "INTERNATIONAL"]);
export const destinationType = z.enum(["COUNTRY", "REGION", "CITY", "PLACE"]);
export const guideCategory = z.enum([
  "DESTINATION_GUIDE",
  "VISA_GUIDE",
  "TRAVEL_TIPS",
  "THINGS_TO_DO",
  "BEST_TIME_TO_VISIT",
  "TRAVEL_COST_GUIDE",
  "TRAVEL_FAQ",
]);
export const visaPurpose = z.enum(["TOURISM", "BUSINESS", "TRANSIT", "FAMILY_VISIT"]);

export const regionInput = z.object({
  name: text(100),
  slug,
  description: optionalText(),
  status: publishStatus.default("DRAFT"),
  sortOrder,
});

export const countryInput = z.object({
  name: text(100),
  slug,
  isoCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "ISO 3166-1 alpha-2 code"),
  demonym: optionalText(60),
  shortDescription: optionalText(300),
  description: optionalText(),
  status: publishStatus.default("DRAFT"),
});

export const destinationInput = z.object({
  name: text(120),
  slug,
  type: destinationType,
  scope: tourScope,
  shortDescription: optionalText(300),
  description: optionalText(),
  bestTimeToVisit: optionalText(300),
  averageDuration: optionalText(100),
  isFeatured: z.boolean().default(false),
  isSample: z.boolean().default(false),
  status: publishStatus.default("DRAFT"),
  sortOrder,
});

export const tourCategoryInput = z.object({
  name: text(80),
  slug,
  description: optionalText(300),
  status: publishStatus.default("DRAFT"),
  sortOrder,
});

export const tourPackageInput = z
  .object({
    name: text(160),
    slug,
    shortDescription: optionalText(300),
    description: optionalText(20_000),
    durationDays: z.number().int().min(1).max(90),
    durationNights: z.number().int().min(0).max(90),
    startingPrice: price.nullable().default(null),
    currency: currency.default("INR"),
    priceNote: optionalText(120),
    isFeatured: z.boolean().default(false),
    isSample: z.boolean().default(false),
    status: publishStatus.default("DRAFT"),
    publishedAt: calendarDate.optional(),
  })
  .refine((p) => p.durationNights <= p.durationDays, {
    message: "Nights cannot exceed days",
    path: ["durationNights"],
  })
  .refine((p) => p.status !== "PUBLISHED" || p.publishedAt, {
    message: "Published packages need a publish date",
    path: ["publishedAt"],
  });

export const itineraryDayInput = z.object({
  dayNumber: z.number().int().min(1).max(90),
  title: text(160),
  description: optionalText(),
  morningActivities: optionalText(),
  afternoonActivities: optionalText(),
  eveningActivities: optionalText(),
  breakfast: z.boolean().default(false),
  lunch: z.boolean().default(false),
  dinner: z.boolean().default(false),
  accommodationNote: optionalText(160),
});

/** Days must be numbered 1..n with no gaps or repeats. */
export const itineraryInput = z
  .array(itineraryDayInput)
  .min(1)
  .refine((days) => days.every((d, i) => d.dayNumber === i + 1), "Days must be numbered 1, 2, 3... in order");

export const hotelInput = z.object({
  name: text(160),
  slug,
  city: optionalText(100),
  description: optionalText(),
  starRating: starRating.optional(),
  website: httpUrl.optional(),
  isSample: z.boolean().default(false),
});

export const packageHotelInput = z.object({
  nights: z.number().int().min(1).max(60),
  city: optionalText(100),
  roomType: optionalText(100),
  mealPlan: optionalText(100),
  isOption: z.boolean().default(false),
  sortOrder,
});

export const listItemInput = z.object({
  title: text(200),
  description: optionalText(1000),
  sortOrder,
});

export const visaKind = z.enum(["VISA_FREE", "VISA_ON_ARRIVAL", "E_VISA", "ETA", "VISA_REQUIRED"]);

export const visaTypeInput = z.object({
  name: text(120),
  slug,
  purpose: visaPurpose,
  /** Only set from a verified official source. */
  kind: visaKind.nullable().default(null),
  description: optionalText(),
  eligibility: optionalText(),
  processingTime: optionalText(120),
  validity: optionalText(120),
  maxStay: optionalText(120),
  entries: optionalText(60),
  fee: z.number().min(0).nullable().default(null),
  currency: currency.optional(),
  importantNotes: optionalText(),
  status: publishStatus.default("DRAFT"),
  sortOrder,
});

export const visaRequirementInput = z.object({
  title: text(160),
  description: optionalText(1000),
  required: z.boolean().default(true),
  sortOrder,
});

export const travelGuideInput = z
  .object({
    title: text(200),
    slug,
    excerpt: optionalText(400),
    content: z.string().trim().min(1).max(100_000),
    category: guideCategory,
    isSample: z.boolean().default(false),
    status: publishStatus.default("DRAFT"),
    publishedAt: calendarDate.optional(),
  })
  .refine((g) => g.status !== "PUBLISHED" || g.publishedAt, {
    message: "Published guides need a publish date",
    path: ["publishedAt"],
  });

export const faqInput = z.object({
  question: text(300),
  answer: z.string().trim().min(1).max(5000),
  placement: z.enum(["DEFAULT", "HOMEPAGE", "VISA"]).default("DEFAULT"),
  sortOrder,
  isSample: z.boolean().default(false),
  status: publishStatus.default("DRAFT"),
});

/** Reviews are entered by staff from real customers. */
export const reviewInput = z.object({
  travellerName: text(120),
  rating,
  title: optionalText(160),
  content: z.string().trim().min(10).max(5000),
  travelDate: calendarDate.optional(),
  source: optionalText(60),
  verified: z.boolean().default(false),
  status: z.enum(["PENDING", "PUBLISHED", "HIDDEN"]).default("PENDING"),
});

/** SEO overrides (all optional). */
export const seoInput = z.object({
  seoTitle: optionalText(70),
  metaDescription: optionalText(170),
  canonicalUrl: httpUrl.optional(),
  ogTitle: optionalText(95),
  ogDescription: optionalText(200),
  noIndex: z.boolean().default(false),
});
