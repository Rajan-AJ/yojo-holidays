import "server-only";
import { query, queryOne } from "@/lib/db";
import type { FaqItem, ImageAsset, SeoView } from "@/types/content";
import { nonEmptyDoc, type RichTextDoc } from "@/lib/rich-text";
import { faqsJson, live, mediaJson, seoJson, toImage, toIso, toSeo, type MediaRow } from "./shared";

/**
 * CMS pages (About, Privacy, Terms, campaign landing pages): a page is an
 * ordered list of blocks (page_sections) whose content is validated per block
 * type here, so a malformed block is skipped instead of breaking the page.
 */

export type PageBlock =
  | { type: "rich_text"; heading?: string; eyebrow?: string; body?: RichTextDoc }
  | { type: "image_text"; heading?: string; eyebrow?: string; body?: RichTextDoc; image?: ImageAsset; button?: { label: string; href: string } }
  | { type: "stats"; heading?: string; eyebrow?: string; items: { value: string; label: string }[] }
  | { type: "cta"; heading?: string; eyebrow?: string; body?: RichTextDoc; button?: { label: string; href: string } }
  | { type: "faq"; heading?: string; eyebrow?: string }
  | { type: "tours" | "destinations" | "testimonials"; heading?: string; eyebrow?: string };

export type CmsPage = {
  slug: string;
  title: string;
  template: string;
  blocks: PageBlock[];
  faqs: FaqItem[];
  updatedAt?: string;
  isSample: boolean;
  seo: SeoView;
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
/** Button links: site paths, https, tel: and WhatsApp only. */
const href = (v: unknown) => {
  const s = str(v);
  return s && /^(\/(?!\/)|https:\/\/|tel:|mailto:)/.test(s) ? s : undefined;
};

function toBlock(type: string, c: Record<string, unknown>, image: MediaRow): PageBlock | null {
  const base = { heading: str(c.heading), eyebrow: str(c.eyebrow) };
  const body = nonEmptyDoc(c.body);
  const button = str(c.button_label) && href(c.button_href) ? { label: str(c.button_label)!, href: href(c.button_href)! } : undefined;
  switch (type) {
    case "rich_text":
      return body || base.heading ? { type, ...base, body } : null;
    case "image_text":
      return { type, ...base, body, image: toImage(image), button };
    case "stats": {
      const items = (str(c.lines) ?? "")
        .split("\n")
        .map((line) => line.split("|").map((x) => x.trim()))
        .filter(([v, l]) => v && l)
        .slice(0, 8)
        .map(([value, label]) => ({ value, label }));
      return items.length ? { type, ...base, items } : null;
    }
    case "cta":
      return { type, ...base, body, button };
    case "faq":
    case "tours":
    case "destinations":
    case "testimonials":
      return { type, ...base };
    default:
      return null;
  }
}

export async function findPageBySlug(slug: string): Promise<CmsPage | null> {
  const row = await queryOne<{
    slug: string;
    title: string;
    template: string;
    is_sample: boolean;
    updated_at: Date;
    sections: { type: string; content: Record<string, unknown>; image: MediaRow }[];
    faqs: FaqItem[];
    seo: Parameters<typeof toSeo>[0];
  }>(
    `select pg.slug, pg.title, pg.template, pg.is_sample, pg.updated_at,
            (select coalesce(json_agg(json_build_object('type', s.section_type, 'content', s.content,
                     'image', ${mediaJson("(case when s.content->>'media_id' ~ '^[0-9a-f-]{36}$' then (s.content->>'media_id')::uuid end)")}) order by s.sort_order), '[]'::json)
               from public.page_sections s where s.page_id = pg.id and s.is_visible) as sections,
            ${faqsJson("page_id", "pg.id")} as faqs,
            ${seoJson("pg.seo_meta_id")} as seo
       from public.pages pg where pg.slug = $1 and ${live("pg")}`,
    [slug],
  );
  if (!row) return null;
  return {
    slug: row.slug,
    title: row.title,
    template: row.template,
    blocks: row.sections.map((s) => toBlock(s.type, s.content ?? {}, s.image)).filter((b): b is PageBlock => b !== null),
    faqs: row.faqs,
    updatedAt: toIso(row.updated_at),
    isSample: row.is_sample,
    seo: toSeo(row.seo),
  };
}

/** Pages served by the generic /{slug}/ route (home, faq and visa have their own routes). */
export async function findCmsPageSlugs() {
  const rows = await query<{ slug: string }>(
    `select pg.slug from public.pages pg where ${live("pg")} and pg.slug not in ('home', 'faq', 'visa')`,
  );
  return rows.map((r) => r.slug);
}

export async function cmsPageExists(slug: string) {
  return Boolean(await queryOne(`select 1 from public.pages pg where pg.slug = $1 and ${live("pg")}`, [slug]));
}
