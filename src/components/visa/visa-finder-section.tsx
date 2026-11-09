import { getVisaGuides, getVisaPassports } from "@/server/queries";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { VisaFinder, type FinderAnswers } from "./visa-finder";

/**
 * Loads the Visa Finder's options from the database on the server and hands
 * the client component only what it needs (passport codes, country names,
 * purposes). Visa details themselves stay on the server.
 */
export async function VisaFinderSection({
  initial,
  headingLevel,
}: {
  initial?: FinderAnswers;
  headingLevel?: "h2" | "h3";
}) {
  const [passports, guides] = await Promise.all([getVisaPassports(), getVisaGuides()]);

  if (passports.length === 0 || guides.length === 0) {
    return (
      <EmptyState
        title="Visa guides are on their way."
        description="In the meantime our team can tell you what you need for your trip."
        action={<ButtonLink href={routes.planTrip({ visa: "help" })}>Talk to a visa expert</ButtonLink>}
      />
    );
  }

  return (
    <VisaFinder
      headingLevel={headingLevel}
      passports={passports}
      initial={initial}
      guides={guides.map((g) => ({
        passportIso: g.passportIso,
        countrySlug: g.countrySlug,
        countryName: g.countryName,
        purposes: g.purposes,
      }))}
    />
  );
}
