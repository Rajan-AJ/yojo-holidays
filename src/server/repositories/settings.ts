import "server-only";
import { query, queryOne } from "@/lib/db";
import { mediaJson, opt, toImage, type MediaRow } from "./shared";

export type SiteSettings = {
  companyName: string;
  legalName?: string;
  logo?: ReturnType<typeof toImage>;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string };
  googleMapsUrl?: string;
  gstNumber?: string;
  seoTitleTemplate: string;
  defaultMetaDescription?: string;
  defaultOgImage?: ReturnType<typeof toImage>;
  social: { platform: string; url: string }[];
};

export async function findSiteSettings(): Promise<SiteSettings | null> {
  const row = await queryOne<{
    company_name: string;
    legal_name: string | null;
    logo: MediaRow;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    address: SiteSettings["address"] | null;
    google_maps_url: string | null;
    gst_number: string | null;
    default_seo_title_template: string;
    default_meta_description: string | null;
    og: MediaRow;
  }>(
    `select company_name, legal_name, ${mediaJson("logo_media_id")} as logo, phone, whatsapp, email, address,
            google_maps_url, gst_number, default_seo_title_template, default_meta_description,
            ${mediaJson("default_og_media_id")} as og
       from public.site_settings where id`,
  );
  if (!row) return null;
  const social = await query<{ platform: string; url: string }>(
    `select platform, url from public.social_links where is_active order by sort_order, platform`,
  );
  return {
    companyName: row.company_name,
    legalName: opt(row.legal_name),
    logo: toImage(row.logo),
    phone: opt(row.phone),
    whatsapp: opt(row.whatsapp),
    email: opt(row.email),
    address: opt(row.address),
    googleMapsUrl: opt(row.google_maps_url),
    gstNumber: opt(row.gst_number),
    seoTitleTemplate: row.default_seo_title_template,
    defaultMetaDescription: opt(row.default_meta_description),
    defaultOgImage: toImage(row.og),
    social,
  };
}
