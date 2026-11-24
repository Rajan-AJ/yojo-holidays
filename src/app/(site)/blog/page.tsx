import { Suspense } from "react";
import { getBlogCategories, getLatestGuides } from "@/server/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { listingTrail } from "@/lib/seo/breadcrumbs";
import { routes } from "@/lib/routes";
import { siteConfig } from "@/config/site";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { PageHero } from "@/components/sections/page-hero";
import { BLOG_PAGE_SIZE, BlogList, BlogTopics, parseCursor } from "@/components/blog/blog-list";

const intro = "Destination guides, visa explainers and practical tips from the people who plan our trips.";

export const metadata = buildMetadata({ title: "Travel Blog", description: intro, path: routes.journal() });

async function Posts({ searchParams }: { searchParams: PageProps<"/blog">["searchParams"] }) {
  const before = parseCursor((await searchParams).before);
  const posts = await getLatestGuides({ limit: BLOG_PAGE_SIZE, before });
  return <BlogList posts={posts} basePath={routes.journal()} showLead={!before} />;
}

export default async function Page({ searchParams }: PageProps<"/blog">) {
  const categories = await getBlogCategories();
  return (
    <>
      <PageHero title="Travel Blog" eyebrow={siteConfig.name} intro={intro} breadcrumbs={listingTrail({ name: "Blog", href: routes.journal() })} />
      <Section spacing="compact">
        <Container size="wide">
          <BlogTopics categories={categories} />
          <div className="mt-12">
            <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-sand" aria-hidden="true" />}>
              <Posts searchParams={searchParams} />
            </Suspense>
          </div>
        </Container>
      </Section>
    </>
  );
}
