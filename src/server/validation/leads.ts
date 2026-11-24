import { z } from "zod";
import { optionalText, phoneE164, sitePath, slug, text } from "./common";

/**
 * Public enquiry form input. Untrusted browser data: every field is trimmed,
 * length-limited and type-checked here, on the server, regardless of any
 * client-side validation. Field names match the form's `name` attributes.
 *
 * Nullability follows the database: NULL means "the form didn't ask / the
 * customer didn't say", so optional fields stay undefined, never "" or 0.
 */

const email = z.email("Enter a valid email address").trim().toLowerCase().max(254);

/** Empty strings from untouched inputs become undefined before validation. */
const blank = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema.optional());

const count = (max: number) => blank(z.coerce.number().int().min(0).max(max));

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

const isoDay = z.iso.date();

/** One attribution touch, captured by the browser (src/components/forms/attribution.ts). */
export const touchInput = z.object({
  utm_source: optionalText(255),
  utm_medium: optionalText(255),
  utm_campaign: optionalText(255),
  utm_term: optionalText(255),
  utm_content: optionalText(255),
  gclid: optionalText(255),
  gbraid: optionalText(255),
  wbraid: optionalText(255),
  fbclid: optionalText(500),
  fbc: optionalText(500),
  fbp: optionalText(255),
  landing_path: z.string().trim().max(2048).regex(/^\//).optional().catch(undefined),
  referrer: z.string().trim().max(2048).optional().catch(undefined),
  at: z.iso.datetime().optional().catch(undefined),
});
export type TouchInput = z.infer<typeof touchInput>;

/** Attribution arrives as JSON in a hidden field; anything malformed is simply dropped. */
const attribution = z.preprocess(
  (v) => {
    if (typeof v !== "string" || v.length > 8000) return undefined;
    try {
      return JSON.parse(v);
    } catch {
      return undefined;
    }
  },
  z.object({ first: touchInput.optional(), last: touchInput.optional() }).optional().catch(undefined),
);

export const leadInput = z
  .object({
    enquiryType: z.enum(["package", "custom_trip", "visa", "callback", "general"]).default("custom_trip"),
    name: text(120),
    phone: phoneE164,
    whatsappSameAsPhone: checkbox.default(true),
    whatsapp: blank(phoneE164),
    email: blank(email),
    city: blank(text(80)),
    destination: blank(text(200)),
    packageSlug: blank(slug),
    departureCity: blank(text(100)),
    travelDate: blank(
      isoDay.refine((d) => new Date(`${d}T23:59:59+05:30`).getTime() >= Date.now(), "Travel date can't be in the past"),
    ),
    dateFlexibility: blank(z.enum(["exact", "flexible_week", "flexible_month", "undecided"])),
    durationNights: count(90),
    adults: blank(z.coerce.number().int().min(1).max(99)),
    children: count(99),
    infants: count(20),
    budget: blank(z.enum(["under-50k", "50k-1l", "1l-2l", "2l-5l", "above-5l"])),
    message: blank(z.string().trim().max(5000)),
    marketingConsent: checkbox.default(false),
    whatsappOptIn: checkbox.default(false),
    formPath: sitePath.default("/"),
    attribution,
    /** Honeypot: humans never see or fill this field. */
    company_website: z.string().max(500).optional(),
  })
  .refine((v) => v.enquiryType !== "general" || Boolean(v.message), {
    message: "Tell us how we can help",
    path: ["message"],
  });

export type LeadInput = z.input<typeof leadInput>;
export type LeadData = z.output<typeof leadInput>;

/** Budget bands shown in the form -> stored min/max (INR). */
export const budgetBands: Record<NonNullable<LeadData["budget"]>, { label: string; min: number; max: number | null }> = {
  "under-50k": { label: "Under ₹50,000", min: 0, max: 50_000 },
  "50k-1l": { label: "₹50,000 – ₹1 lakh", min: 50_000, max: 100_000 },
  "1l-2l": { label: "₹1 – 2 lakh", min: 100_000, max: 200_000 },
  "2l-5l": { label: "₹2 – 5 lakh", min: 200_000, max: 500_000 },
  "above-5l": { label: "Above ₹5 lakh", min: 500_000, max: null },
};
