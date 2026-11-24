import { notFound } from "next/navigation";
import { getCmsPage, getCmsPageSlugs } from "@/server/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { listingTrail } from "@/lib/seo/breadcrumbs";
import { JsonLd } from "@/lib/seo/json-ld";
import { faqSchema } from "@/lib/seo/schema";
import { richTextToPlain } from "@/lib/rich-text";
import { formatDate } from "@/lib/format";
import { PageHero } from "@/components/sections/page-hero";
import { Container } from "@/components/ui/container";
import { PageBlocks } from "@/components/sections/page-blocks";

/**
 * /{slug}/ - pages built in the CMS (About, Privacy Policy, Terms, campaign
 * landing pages). Fixed routes (/tours/, /visa/...) always win over this one;
 * src/proxy.ts gives unknown slugs a real 404.
 */

export async function generateStaticParams() {
  const slugs = await getCmsPageSlugs();
  return (slugs.length > 0 ? slugs : ["__none__"]).map((page) => ({ page }));
}

export async function generateMetadata({ params }: PageProps<"/[page]">) {
  const page = await getCmsPage((await params).page);
  if (!page) return {};
  const firstText = page.blocks.map((b) => ("body" in b ? richTextToPlain(b.body) : "")).find(Boolean);
  return buildMetadata({
    title: page.title,
    description: firstText?.slice(0, 160),
    path: `/${page.slug}/`,
    seo: page.seo,
    noindex: page.template === "landing" && !page.seo.title,
  });
}

export default async function CmsPage({ params }: PageProps<"/[page]">) {
  const page = await getCmsPage((await params).page);
  if (!page) notFound();
  const legal = page.template === "legal";

  return (
    <>
      <PageHero
        title={page.title}
        size="compact"
        isSample={page.isSample}
        breadcrumbs={listingTrail({ name: page.title, href: `/${page.slug}/` })}
      />
      {legal && page.updatedAt && (
        <Container size="narrow" className="pt-10">
          <p className="text-body-sm text-muted">Last updated {formatDate(page.updatedAt)}</p>
        </Container>
      )}
      <PageBlocks blocks={page.blocks} faqs={page.faqs} />
      {page.blocks.some((b) => b.type === "faq") && <JsonLd data={faqSchema(page.faqs)} />}
    </>
  );
}
