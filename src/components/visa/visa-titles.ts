import type { VisaCountryDetail } from "@/types/content";

/** "Vietnam Visa for Indian Travellers" (falls back to the passport's country name). */
export function visaGuideTitle(guide: Pick<VisaCountryDetail, "country" | "passport">) {
  const who = guide.passport.demonym ? `${guide.passport.demonym} Travellers` : `${guide.passport.name} Passport Holders`;
  return `${guide.country.name} Visa for ${who}`;
}

/** "Indians" / "United States passport holders", for metadata titles. */
export function visaAudience(guide: Pick<VisaCountryDetail, "passport">) {
  return guide.passport.demonym ? `${guide.passport.demonym}s` : `${guide.passport.name} passport holders`;
}
