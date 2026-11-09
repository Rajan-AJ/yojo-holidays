import { ListingPage } from "@/components/templates/listing-page";
import { buildMetadata } from "@/lib/seo/metadata";
import { listingTrail } from "@/lib/seo/breadcrumbs";
import { routes } from "@/lib/routes";

const intro = "Every journey we offer, in India and abroad. Filter by destination, length or travel style.";

export const metadata = buildMetadata({
  title: "Tour Packages",
  description: intro,
  path: routes.tours(),
});

export default function ToursPage({ searchParams }: PageProps<"/tours">) {
  return (
    <ListingPage
      title="Tour Packages"
      eyebrow="All tours"
      intro={intro}
      breadcrumbs={listingTrail({ name: "Tours", href: routes.tours() })}
      base={{}}
      path={routes.tours()}
      searchParams={searchParams}
    />
  );
}
