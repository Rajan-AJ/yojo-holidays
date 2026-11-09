import { ListingPage } from "@/components/templates/listing-page";
import { buildMetadata } from "@/lib/seo/metadata";
import { listingTrail, scopeCrumb } from "@/lib/seo/breadcrumbs";
import { scopeTitle } from "@/lib/labels";
import { routes } from "@/lib/routes";

const intro = "Journeys beyond India, from Southeast Asia to the Middle East and beyond.";

export const metadata = buildMetadata({
  title: `${scopeTitle.INTERNATIONAL} & Holiday Packages`,
  description: intro,
  path: routes.scope("INTERNATIONAL"),
});

export default function Page({ searchParams }: PageProps<"/international-tours">) {
  return (
    <ListingPage
      title={scopeTitle.INTERNATIONAL}
      eyebrow="Tour packages"
      intro={intro}
      breadcrumbs={listingTrail(scopeCrumb("INTERNATIONAL"))}
      base={{ scope: "INTERNATIONAL" }}
      path={routes.scope("INTERNATIONAL")}
      searchParams={searchParams}
    />
  );
}
