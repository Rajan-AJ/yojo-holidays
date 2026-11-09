import { notFound } from "next/navigation";
import { getTourCategoryBySlug, getTourCategorySlugs } from "@/server/queries";
import { ListingPage } from "@/components/templates/listing-page";
import { buildMetadata, truncateDescription } from "@/lib/seo/metadata";
import { listingTrail } from "@/lib/seo/breadcrumbs";
import { routes } from "@/lib/routes";

/**
 * Travel-style listing (Family, Honeymoon, Senior Citizen...).
 *
 * Public URL: /{slug}-tours/ (e.g. /family-tours/). src/proxy.ts checks the
 * style exists and rewrites that URL to this internal route; unknown styles get
 * a real 404 there. Requests to /tour-styles/... directly are redirected to the
 * public URL, so each style has exactly one canonical address.
 */

export async function generateStaticParams() {
  const slugs = await getTourCategorySlugs();
  // Cache Components requires at least one param; the fallback simply 404s.
  return (slugs.length > 0 ? slugs : ["__none__"]).map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps<"/tour-styles/[category]">) {
  const category = await getTourCategoryBySlug((await params).category);
  if (!category) return {};
  return buildMetadata({
    title: `${category.name} Tours & Holiday Packages`,
    description: truncateDescription(category.description),
    path: category.href,
    image: category.image,
    seo: category.seo,
  });
}

export default async function Page({ params, searchParams }: PageProps<"/tour-styles/[category]">) {
  const category = await getTourCategoryBySlug((await params).category);
  if (!category) notFound();

  return (
    <ListingPage
      title={`${category.name} Tours`}
      eyebrow="Travel style"
      intro={category.description}
      image={category.image}
      breadcrumbs={listingTrail(
        { name: `${category.name} Tours`, href: category.href },
        { name: "Tours", href: routes.tours() },
      )}
      base={{ category: category.slug }}
      path={category.href}
      searchParams={searchParams}
    />
  );
}
