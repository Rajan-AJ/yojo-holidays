import { z } from "zod";
import type { TourFilters } from "@/types/content";
import { SLUG_PATTERN } from "@/server/validation/common";

/**
 * Listing filters live in the URL (?destination=vietnam&duration=week), so
 * results are shareable, crawlable and work without JavaScript. Values are
 * untrusted: anything invalid is ignored rather than erroring.
 */
const slugParam = z.string().max(120).regex(SLUG_PATTERN);

const schema = z.object({
  destination: slugParam.optional().catch(undefined),
  category: slugParam.optional().catch(undefined),
  duration: z.enum(["short", "week", "long"]).optional().catch(undefined),
  maxPrice: z.coerce.number().int().positive().max(10_000_000).optional().catch(undefined),
});

type RawParams = Record<string, string | string[] | undefined>;

export function parseTourFilters(params: RawParams): TourFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  return schema.parse({
    destination: first(params.destination),
    category: first(params.category),
    duration: first(params.duration),
    maxPrice: first(params.maxPrice),
  });
}

export const durationLabels = {
  short: "Up to 4 days",
  week: "5 to 8 days",
  long: "9 days or more",
} as const;

/** Price ceilings offered only when packages actually have prices. */
export const priceCeilings = [50_000, 100_000, 200_000, 400_000];

export const hasActiveFilters = (f: TourFilters) =>
  Boolean(f.destination || f.category || f.duration || f.maxPrice);
