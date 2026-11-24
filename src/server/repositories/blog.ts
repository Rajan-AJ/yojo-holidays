import "server-only";
import { query, queryOne } from "@/lib/db";
import type { ArticleSummary, BlogCategoryRef, FaqItem, TravelGuideDetail } from "@/types/content";
import { routes } from "@/lib/routes";
import { isRichTextDoc, type RichTextDoc } from "@/lib/rich-text";
import { faqsJson, live, mediaJson, opt, seoJson, toImage, toIso, toSeo, type MediaRow } from "./shared";
import { findPackagesBySlugs } from "./packages";

const SUMMARY_COLUMNS = `
  b.id, b.title, b.slug, b.excerpt, b.published_at, b.is_sample,
  ${mediaJson("b.featured_media_id")} as image,
  (select json_build_object('name', c.name, 'slug', c.slug) from public.blog_categories c
    where c.id = b.category_id and ${live("c")}) as category`;

const FROM_VISIBLE = `from public.blog_posts b where ${live("b")}`;

type SummaryRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: Date;
  is_sample: boolean;
  image: MediaRow;
  category: { name: string; slug: string } | null;
};

const toCategory = (c: { name: string; slug: string } | null): BlogCategoryRef | undefined =>
  c ? { name: c.name, slug: c.slug, href: routes.blogCategory(c.slug) } : undefined;

function summaryFields(row: SummaryRow) {
  return {
    id: row.id,
    title: row.title,
    href: routes.article(row.slug),
    category: toCategory(row.category),
    excerpt: opt(row.excerpt),
    publishedAt: toIso(row.published_at),
    isSample: row.is_sample,
  };
}

function toSummaries(rows: SummaryRow[]): ArticleSummary[] {
  return rows.flatMap((row) => {
    const image = toImage(row.image);
    return image ? [{ ...summaryFields(row), image }] : [];
  });
}

/**
 * Latest posts, newest first. Keyset pagination: pass the last item's
 * publishedAt + id as `before` to get the next page (fast at any depth).
 */
export async function findLatestPosts({
  limit = 4,
  category,
  destinationSlug,
  countrySlug,
  tag,
  before,
}: {
  limit?: number;
  category?: string;
  destinationSlug?: string;
  countrySlug?: string;
  tag?: string;
  before?: { publishedAt: string; id: string };
} = {}) {
  const params: unknown[] = [];
  const add = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  const where: string[] = [];
  if (category) {
    where.push(`exists (select 1 from public.blog_categories c where c.id = b.category_id and c.slug = ${add(category)})`);
  }
  if (destinationSlug) {
    const s = add(destinationSlug);
    where.push(`exists (select 1 from public.blog_post_destinations bd
      join public.destinations d on d.id = bd.destination_id
      left join public.destinations dp on dp.id = d.parent_id
      where bd.post_id = b.id and (d.slug = ${s} or dp.slug = ${s}))`);
  }
  if (countrySlug) {
    where.push(`exists (select 1 from public.blog_post_destinations bd
      join public.destinations d on d.id = bd.destination_id
      join public.countries c on c.id = d.country_id
      where bd.post_id = b.id and c.slug = ${add(countrySlug)})`);
  }
  if (tag) {
    where.push(`exists (select 1 from public.blog_post_tags bt join public.tags t on t.id = bt.tag_id
      where bt.post_id = b.id and t.slug = ${add(tag)})`);
  }
  if (before) where.push(`(b.published_at, b.id) < (${add(before.publishedAt)}::timestamptz, ${add(before.id)}::uuid)`);
  const rows = await query<SummaryRow>(
    `select ${SUMMARY_COLUMNS} ${FROM_VISIBLE} ${where.length ? `and ${where.join(" and ")}` : ""}
      order by b.published_at desc, b.id desc limit ${add(limit)}`,
    params,
  );
  return toSummaries(rows);
}

export async function findBlogCategories() {
  const rows = await query<{ name: string; slug: string; description: string | null; post_count: number }>(
    `select c.name, c.slug, c.description,
            (select count(*) from public.blog_posts b where b.category_id = c.id and ${live("b")}) as post_count
       from public.blog_categories c where ${live("c")} order by c.sort_order, c.name`,
  );
  return rows.map((c) => ({ ...toCategory(c)!, description: opt(c.description), postCount: c.post_count }));
}

export async function findBlogCategoryBySlug(slug: string) {
  const row = await queryOne<{ name: string; slug: string; description: string | null; seo: Parameters<typeof toSeo>[0] }>(
    `select c.name, c.slug, c.description, ${seoJson("c.seo_meta_id")} as seo
       from public.blog_categories c where ${live("c")} and c.slug = $1`,
    [slug],
  );
  return row ? { ...toCategory(row)!, description: opt(row.description), seo: toSeo(row.seo) } : null;
}

export async function findPostSlugs() {
  return (await query<{ slug: string }>(`select b.slug ${FROM_VISIBLE}`)).map((r) => r.slug);
}

export async function findBlogCategorySlugs() {
  return (await query<{ slug: string }>(`select c.slug from public.blog_categories c where ${live("c")}`)).map((r) => r.slug);
}

export async function postExists(slug: string) {
  return Boolean(await queryOne(`select 1 ${FROM_VISIBLE} and b.slug = $1`, [slug]));
}

export async function blogCategoryExists(slug: string) {
  return Boolean(await queryOne(`select 1 from public.blog_categories c where ${live("c")} and c.slug = $1`, [slug]));
}

export async function findPostBySlug(slug: string): Promise<TravelGuideDetail | null> {
  const row = await queryOne<
    SummaryRow & {
      content: RichTextDoc;
      reading_minutes: number | null;
      updated: Date;
      author: { name: string; slug: string; bio: string | null; image: MediaRow } | null;
      destination: { name: string; slug: string } | null;
      tags: { name: string; slug: string }[];
      package_slugs: string[];
      related: SummaryRow[];
      faqs: FaqItem[];
      seo: Parameters<typeof toSeo>[0];
    }
  >(
    `select ${SUMMARY_COLUMNS}, b.content, b.reading_minutes,
            coalesce(b.content_updated_at, b.published_at) as updated,
            (select json_build_object('name', a.name, 'slug', a.slug, 'bio', a.bio, 'image', ${mediaJson("a.photo_media_id")})
               from public.authors a where a.id = b.author_id and ${live("a")}) as author,
            (select json_build_object('name', d.name, 'slug', d.slug)
               from public.blog_post_destinations bd join public.destinations d on d.id = bd.destination_id
              where bd.post_id = b.id and ${live("d")} limit 1) as destination,
            (select coalesce(json_agg(json_build_object('name', t.name, 'slug', t.slug) order by t.name), '[]'::json)
               from public.blog_post_tags bt join public.tags t on t.id = bt.tag_id where bt.post_id = b.id) as tags,
            (select coalesce(array_agg(p.slug order by bp.sort_order), '{}')
               from public.blog_post_packages bp join public.packages p on p.id = bp.package_id
              where bp.post_id = b.id and ${live("p")}) as package_slugs,
            -- related: same category first, then newest
            (select coalesce(json_agg(r.j), '[]'::json) from (
               select json_build_object('id', o.id, 'title', o.title, 'slug', o.slug, 'excerpt', o.excerpt,
                                        'published_at', o.published_at, 'is_sample', o.is_sample,
                                        'image', ${mediaJson("o.featured_media_id")},
                                        'category', (select json_build_object('name', c.name, 'slug', c.slug)
                                                       from public.blog_categories c where c.id = o.category_id)) as j
                 from public.blog_posts o
                where ${live("o")} and o.id <> b.id
                order by (o.category_id is not distinct from b.category_id) desc, o.published_at desc limit 3) r) as related,
            ${faqsJson("blog_post_id", "b.id")} as faqs,
            ${seoJson("b.seo_meta_id")} as seo
       ${FROM_VISIBLE} and b.slug = $1`,
    [slug],
  );
  if (!row) return null;

  const relatedTours = await findPackagesBySlugs(row.package_slugs);

  return {
    ...summaryFields(row),
    slug: row.slug,
    image: toImage(row.image),
    content: isRichTextDoc(row.content) ? row.content : { type: "doc", content: [] },
    readingMinutes: opt(row.reading_minutes),
    updatedAt: toIso(row.updated) ?? new Date().toISOString(),
    author: row.author
      ? { name: row.author.name, slug: row.author.slug, bio: opt(row.author.bio), image: toImage(row.author.image) }
      : undefined,
    destination: row.destination ? { name: row.destination.name, href: routes.destination(row.destination.slug) } : undefined,
    tags: row.tags,
    relatedTours,
    faqs: row.faqs,
    related: toSummaries(row.related),
    seo: toSeo(row.seo),
  };
}
