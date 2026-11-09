/**
 * Cache tags for public content. Queries tag their results; when content
 * changes (admin save, Phase 11) the server action calls `revalidateTag()`
 * with the matching tag so pages update immediately without a rebuild.
 */
export const tags = {
  destinations: "destinations",
  destination: (slug: string) => `destination:${slug}`,
  countries: "countries",
  country: (slug: string) => `country:${slug}`,
  packages: "packages",
  package: (destinationSlug: string, slug: string) => `package:${destinationSlug}/${slug}`,
  visa: "visa",
  visaCountry: (slug: string) => `visa:${slug}`,
  guides: "guides",
  guide: (slug: string) => `guide:${slug}`,
  faqs: "faqs",
  reviews: "reviews",
} as const;
