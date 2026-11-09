import { z } from "zod";

/**
 * Shared field rules. Every write path (seed, server actions, admin) parses
 * input with these before it reaches Prisma. Database CHECK constraints in the
 * migration enforce the same rules as a last line of defence.
 */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slug = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens, e.g. vietnam-7-days");

/** "Vietnam 7 Days / 6 Nights" -> "vietnam-7-days-6-nights" */
export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/** ISO 4217 currency code. */
export const currency = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. INR");

/** Positive money amount with at most 2 decimals (fits Decimal(12,2)). */
export const price = z
  .number()
  .positive()
  .max(9_999_999_999.99)
  .refine((n) => Math.round(n * 100) === n * 100, "At most 2 decimal places");

export const rating = z.number().int().min(1).max(5);

export const starRating = z.number().int().min(1).max(5);

export const sortOrder = z.number().int().min(0).max(100_000).default(0);

/** Required, trimmed text with a sensible upper bound. */
export const text = (max = 500) => z.string().trim().min(1).max(max);
export const optionalText = (max = 5000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

/** Calendar date ("2026-12-01" or a Date). Rejects impossible dates. */
export const calendarDate = z.coerce.date().refine((d) => !Number.isNaN(d.getTime()), "Invalid date");

export const httpUrl = z
  .url({ protocol: /^https?$/ })
  .max(2000);

/** Site-relative path like "/visa/vietnam/" (never a full URL from user input). */
export const sitePath = z
  .string()
  .trim()
  .max(500)
  .regex(/^\/[^\s]*$/, "Must be a site path starting with /");

export const publishStatus = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
