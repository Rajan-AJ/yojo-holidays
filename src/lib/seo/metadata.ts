import type { Metadata } from "next";
import type { ImageAsset, SeoView } from "@/types/content";
import { siteConfig } from "@/config/site";

/**
 * Page metadata with a canonical URL and matching Open Graph / Twitter tags.
 * Paths are relative; `metadataBase` in the root layout makes them absolute.
 *
 * `seo` holds per-page overrides from the database (SeoMeta). Each field
 * falls back to the value derived from the content itself.
 *
 * Next merges metadata shallowly: a page's `openGraph` object replaces the
 * root one entirely, so the shared fields are repeated here, and keys are only
 * set when they have a value (an explicit `undefined` title would wipe the
 * root default title).
 */
export function buildMetadata({
  title,
  description,
  path,
  image,
  seo,
  noindex = false,
}: {
  /** Omit on the homepage to use the root default title. The root template appends the brand. */
  title?: string;
  description?: string;
  /** Canonical path with trailing slash, e.g. "/visa/". Use `routes`. */
  path: string;
  image?: ImageAsset;
  seo?: SeoView;
  noindex?: boolean;
}): Metadata {
  const finalTitle = seo?.title ?? title;
  const finalDescription = seo?.description ?? description;
  const ogImage = seo?.ogImage ?? image;
  const images = ogImage
    ? [{ url: ogImage.src, alt: ogImage.alt, width: ogImage.width, height: ogImage.height }]
    : undefined;

  const text = {
    ...(finalTitle && { title: finalTitle }),
    ...(finalDescription && { description: finalDescription }),
  };
  const social = {
    ...((seo?.ogTitle ?? finalTitle) && { title: seo?.ogTitle ?? finalTitle }),
    ...((seo?.ogDescription ?? finalDescription) && {
      description: seo?.ogDescription ?? finalDescription,
    }),
    ...(images && { images }),
  };

  return {
    ...text,
    alternates: { canonical: seo?.canonicalUrl ?? path },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      url: path,
      ...social,
    },
    twitter: { card: "summary_large_image", ...social },
    ...((noindex || seo?.noIndex) && { robots: { index: false, follow: true } }),
  };
}

/** Trim text to a meta-description length on a word boundary. */
export function truncateDescription(text: string | undefined, max = 160) {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, clean.lastIndexOf(" ", max - 1))}…`;
}
