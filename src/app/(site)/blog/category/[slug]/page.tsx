import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getBlogCategories, getBlogCategoryBySlug, getBlogCategorySlugs, getLatestGuides } from "@/server/queries";
import { buildMetadata, truncateDescription } from "@/lib/seo/metadata";
import { listingTrail } from "@/lib/seo/breadcrumbs";
import { routes } from "@/lib/routes";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { PageHero } from "@/components/sections/page-hero";
import { BLOG_PAGE_SIZE, BlogList, BlogTopics, parseCursor } from "@/components/blog/blog-list";

export async function generateStaticParams() {
  const slugs = await getBlogCategorySlugs();
  return (slugs.length > 0 ? slugs : ["__none__"]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/category/[slug]">) {
  const category = await getBlogCategoryBySlug((await params).slug);
  if (!category) return {};
  return buildMetadata({
    title: category.name,
    description: truncateDescription(category.description),
    path: category.href,
    seo: category.seo,
  });
}

async function Posts({ slug, searchParams }: { slug: string; searchParams: PageProps<"/blog/category/[slug]">["searchParams"] }) {
  const before = parseCursor((await searchParams).before);
  const posts = await getLatestGuides({ category: slug, limit: BLOG_PAGE_SIZE, before });
  return <BlogList posts={posts} basePath={routes.blogCategory(slug)} showLead={!before} />;
}

export default async function Page({ params, searchParams }: PageProps<"/blog/category/[slug]">) {
  const { slug } = await params;
  const [category, categories] = await Promise.all([getBlogCategoryBySlug(slug), getBlogCategories()]);
  if (!category) notFound();
  return (
    <>
      <PageHero
        title={category.name}
        eyebrow="Travel Blog"
        intro={category.description}
        breadcrumbs={listingTrail({ name: category.name, href: category.href }, { name: "Blog", href: routes.journal() })}
      />
      <Section spacing="compact">
        <Container size="wide">
          <BlogTopics categories={categories} current={slug} />
          <div className="mt-12">
            <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-sand" aria-hidden="true" />}>
              <Posts slug={slug} searchParams={searchParams} />
            </Suspense>
          </div>
        </Container>
      </Section>
    </>
  );
}
