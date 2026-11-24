/**
 * Cache tags for public content. Queries tag their results; when content
 * changes, the admin's server action calls `revalidateTag()` with the matching
 * tag (see src/server/admin/revalidate.ts) so pages update without a rebuild.
 */
export const tags = {
  destinations: "destinations",
  destination: (slug: string) => `destination:${slug}`,
  countries: "countries",
  country: (slug: string) => `country:${slug}`,
  packages: "packages",
  package: (slug: string) => `package:${slug}`,
  categories: "categories",
  visa: "visa",
  visaCountry: (slug: string) => `visa:${slug}`,
  blog: "blog",
  post: (slug: string) => `post:${slug}`,
  faqs: "faqs",
  reviews: "reviews",
  settings: "settings",
  pages: "pages",
  redirects: "redirects",
} as const;
