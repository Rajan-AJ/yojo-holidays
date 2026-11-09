import { ListingPage } from "@/components/templates/listing-page";
import { buildMetadata } from "@/lib/seo/metadata";
import { listingTrail, scopeCrumb } from "@/lib/seo/breadcrumbs";
import { scopeTitle } from "@/lib/labels";
import { routes } from "@/lib/routes";

const intro = "Holidays across India: backwaters, mountains, heritage cities and coast.";

export const metadata = buildMetadata({
  title: `${scopeTitle.DOMESTIC} & Holiday Packages`,
  description: intro,
  path: routes.scope("DOMESTIC"),
});

export default function Page({ searchParams }: PageProps<"/domestic-tours">) {
  return (
    <ListingPage
      title={scopeTitle.DOMESTIC}
      eyebrow="Tour packages"
      intro={intro}
      breadcrumbs={listingTrail(scopeCrumb("DOMESTIC"))}
      base={{ scope: "DOMESTIC" }}
      path={routes.scope("DOMESTIC")}
      searchParams={searchParams}
    />
  );
}
