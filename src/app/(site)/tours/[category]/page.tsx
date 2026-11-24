import { notFound } from "next/navigation";
import { getTourCategoryBySlug, getTourCategorySlugs } from "@/server/queries";
import { ListingPage } from "@/components/templates/listing-page";
import { buildMetadata, truncateDescription } from "@/lib/seo/metadata";
import { listingTrail } from "@/lib/seo/breadcrumbs";
import { routes } from "@/lib/routes";

/**
 * Travel-style listing: /tours/{category}/ (Family, Honeymoon, Senior Citizen...).
 * Categories are managed in the CMS; new ones get a page automatically.
 * A style with no published tours is noindex (thin content).
 */

export async function generateStaticParams() {
  const slugs = await getTourCategorySlugs();
  // Cache Components requires at least one param; the fallback simply 404s.
  return (slugs.length > 0 ? slugs : ["__none__"]).map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps<"/tours/[category]">) {
  const category = await getTourCategoryBySlug((await params).category);
  if (!category) return {};
  return buildMetadata({
    title: `${category.name} & Holiday Packages`,
    description: truncateDescription(category.description),
    path: category.href,
    image: category.image,
    seo: category.tourCount === 0 ? { ...category.seo, noIndex: true } : category.seo,
  });
}

export default async function Page({ params, searchParams }: PageProps<"/tours/[category]">) {
  const category = await getTourCategoryBySlug((await params).category);
  if (!category) notFound();

  return (
    <ListingPage
      title={category.name}
      eyebrow="Travel style"
      intro={category.description}
      image={category.image}
      breadcrumbs={listingTrail({ name: category.name, href: category.href }, { name: "Tours", href: routes.tours() })}
      base={{ category: category.slug }}
      path={category.href}
      searchParams={searchParams}
    />
  );
}
