import "server-only";
import { query, queryOne } from "@/lib/db";
import type { FaqItem, ReviewView } from "@/types/content";
import { faqsJson, live, mediaJson, opt, toImage, type MediaRow } from "./shared";

// ---------------------------------------------------------------------------
// FAQs placed on CMS pages (home, faq, visa...) via faq_links.page_id
// ---------------------------------------------------------------------------

async function faqsForPage(pageSlug: string, limit?: number): Promise<FaqItem[]> {
  const row = await queryOne<{ faqs: FaqItem[] }>(
    `select ${faqsJson("page_id", "pg.id")} as faqs from public.pages pg where pg.slug = $1 and ${live("pg")}`,
    [pageSlug],
  );
  const faqs = row?.faqs ?? [];
  return limit ? faqs.slice(0, limit) : faqs;
}

export const findHomepageFaqs = (limit = 6) => faqsForPage("home", limit);
export const findGeneralFaqs = () => faqsForPage("faq");

// ---------------------------------------------------------------------------
// Testimonials (real, staff-approved only; never seeded)
// ---------------------------------------------------------------------------

export async function findPublishedReviews({
  limit = 6,
  packageId,
  destinationSlug,
}: { limit?: number; packageId?: string; destinationSlug?: string } = {}): Promise<ReviewView[]> {
  const params: unknown[] = [];
  const where: string[] = [];
  if (packageId) {
    params.push(packageId);
    where.push(`t.package_id = $${params.length}`);
  }
  if (destinationSlug) {
    params.push(destinationSlug);
    where.push(`(d.slug = $${params.length} or pd.slug = $${params.length})`);
  }
  params.push(limit);
  const rows = await query<{
    id: string;
    customer_name: string;
    customer_city: string | null;
    rating: number;
    title: string | null;
    content: string;
    travelled_on: string | null;
    is_verified: boolean;
    is_sample: boolean;
    image: MediaRow;
    destination: string | null;
  }>(
    `select t.id, t.customer_name, t.customer_city, t.rating, t.title, t.content, t.travelled_on, t.is_verified, t.is_sample,
            ${mediaJson("t.photo_media_id")} as image,
            coalesce(d.name, pd.name) as destination
       from public.testimonials t
       left join public.destinations d on d.id = t.destination_id
       left join public.packages p on p.id = t.package_id
       left join public.destinations pd on pd.id = p.primary_destination_id
      where ${live("t")} ${where.length ? `and ${where.join(" and ")}` : ""}
      order by t.is_featured desc, t.sort_order, t.published_at desc
      limit $${params.length}`,
    params,
  );
  return rows.map((r) => ({
    id: r.id,
    body: r.content,
    travellerName: r.customer_city ? `${r.customer_name}, ${r.customer_city}` : r.customer_name,
    destination: opt(r.destination),
    travelYear: r.travelled_on ? Number(r.travelled_on.slice(0, 4)) : undefined,
    rating: r.rating,
    title: opt(r.title),
    verified: r.is_verified,
    image: toImage(r.image),
    isSample: r.is_sample,
  }));
}

/** Average rating + count, for AggregateRating structured data (only real, published testimonials). */
export async function findRatingSummary(packageId?: string) {
  const row = await queryOne<{ count: number; average: number | null }>(
    `select count(*) as count, round(avg(t.rating)::numeric, 1) as average
       from public.testimonials t where ${live("t")} and not t.is_sample ${packageId ? "and t.package_id = $1" : ""}`,
    packageId ? [packageId] : [],
  );
  return row && row.count > 0 && row.average != null ? { count: row.count, average: row.average } : null;
}
