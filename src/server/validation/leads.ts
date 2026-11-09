import { z } from "zod";
import { calendarDate, optionalText, sitePath, text } from "./common";

/**
 * Public form input. This is untrusted data from the browser: every field is
 * trimmed, length-limited and type-checked here, on the server, regardless of
 * any client-side validation.
 */

/** Loose international phone check: digits with optional +, spaces, dashes, brackets. */
const phone = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^\+?[0-9\s\-()]{7,20}$/, "Enter a valid phone number");

const email = z.email().trim().toLowerCase().max(254);

const utm = optionalText(100);

export const leadInput = z.object({
  name: text(120),
  phone,
  email: email.optional(),
  destination: optionalText(120),
  travelDate: calendarDate
    .refine((d) => d.getTime() >= Date.now() - 24 * 60 * 60 * 1000, "Travel date can't be in the past")
    .optional(),
  travellers: z.coerce.number().int().min(1).max(500).optional(),
  budget: optionalText(60),
  tripType: optionalText(60),
  message: optionalText(2000),
  source: utm,
  medium: utm,
  campaign: utm,
  landingPage: sitePath.optional(),
  /** Package being enquired about, by public URL parts (never a raw id from the client). */
  packageRef: z
    .object({ destinationSlug: z.string().max(120), packageSlug: z.string().max(120) })
    .optional(),
});

export type LeadInput = z.input<typeof leadInput>;

export const enquiryInput = z
  .object({
    name: text(120),
    email: email.optional(),
    phone: phone.optional(),
    subject: optionalText(160),
    message: z.string().trim().min(5).max(5000),
    source: optionalText(200),
  })
  .refine((e) => e.email || e.phone, {
    message: "Give an email address or a phone number so we can reply",
    path: ["email"],
  });

export type EnquiryInput = z.input<typeof enquiryInput>;
