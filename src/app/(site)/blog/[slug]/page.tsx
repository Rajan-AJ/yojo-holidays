import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostSlugs, getTravelGuideBySlug } from "@/server/queries";
import { buildMetadata, truncateDescription } from "@/lib/seo/metadata";
import { JsonLd } from "@/lib/seo/json-ld";
import { blogPostingSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Prose } from "@/components/content/prose";
import { TourGrid } from "@/components/sections/tour-grid";
import { FaqSection } from "@/components/sections/faq-section";
import { CTASection } from "@/components/sections/cta-section";
import { ArticleCard } from "@/components/cards/article-card";

// /blog/[slug]/ - generated from the database.
export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return (slugs.length > 0 ? slugs : ["__none__"]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">) {
  const post = await getTravelGuideBySlug((await params).slug);
  if (!post) return {};
  return buildMetadata({
    title: post.title,
    description: truncateDescription(post.excerpt),
    path: post.href,
    image: post.image,
    seo: post.seo,
  });
}

export default async function Page({ params }: PageProps<"/blog/[slug]">) {
  const post = await getTravelGuideBySlug((await params).slug);
  if (!post) notFound();

  const crumbs = [
    { name: "Home", href: routes.home() },
    { name: "Blog", href: routes.journal() },
    ...(post.category ? [{ name: post.category.name, href: post.category.href }] : []),
    { name: post.title, href: post.href },
  ];

  return (
    <>
      <article>
        <header className="pt-[calc(var(--spacing-header)+2rem)]">
          <Container size="narrow">
            <Breadcrumbs items={crumbs} />
            <div className="mt-10">
              {post.category && (
                <Link href={post.category.href} className="eyebrow text-accent-strong hover:underline">
                  {post.category.name}
                </Link>
              )}
              <h1 className="mt-4 font-display text-h1 text-balance">{post.title}</h1>
              {post.excerpt && <p className="mt-6 text-body-lg text-muted">{post.excerpt}</p>}
              <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted">
                {post.author && <span className="font-medium text-ink">{post.author.name}</span>}
                {post.publishedAt && (
                  <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                )}
                {post.readingMinutes && <span>{post.readingMinutes} min read</span>}
                {post.isSample && <span className="rounded-full bg-sand px-2.5 py-0.5 text-caption">Sample content</span>}
              </p>
            </div>
          </Container>
          {post.image && (
            <Container size="wide" className="mt-12">
              <ResponsiveImage image={post.image} aspect="wide" priority sizes="(min-width: 1280px) 1200px, 100vw" className="rounded-3xl" />
            </Container>
          )}
        </header>

        <Section spacing="compact">
          <Container size="narrow">
            <Prose text={post.content} />

            {post.tags.length > 0 && (
              <ul className="mt-12 flex flex-wrap gap-2" aria-label="Tags">
                {post.tags.map((t) => (
                  <li key={t.slug} className="rounded-full border border-line px-3 py-1 text-caption text-muted">
                    #{t.name}
                  </li>
                ))}
              </ul>
            )}

            {post.author?.bio && (
              <aside className="mt-12 flex gap-5 rounded-3xl bg-sand p-6" aria-label="About the author">
                {post.author.image && (
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-full">
                    <ResponsiveImage image={post.author.image} sizes="64px" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">{post.author.name}</p>
                  <p className="mt-1 text-body-sm text-muted">{post.author.bio}</p>
                </div>
              </aside>
            )}
          </Container>
        </Section>
      </article>

      {post.relatedTours.length > 0 && (
        <Section tone="surface" aria-labelledby="tours-title">
          <Container size="wide">
            <SectionHeading id="tours-title" eyebrow="Travel with us" title="Tours from this article" />
            <TourGrid tours={post.relatedTours} columns={3} className="mt-block" />
          </Container>
        </Section>
      )}

      <FaqSection id="faq-title" title="Frequently asked questions" items={post.faqs} showAllLink={false} />

      {post.related.length > 0 && (
        <Section aria-labelledby="related-title">
          <Container size="wide">
            <SectionHeading id="related-title" eyebrow="Keep reading" title="More from the blog" />
            <ul className="mt-block grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {post.related.map((r) => (
                <li key={r.id}>
                  <ArticleCard article={r} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" />
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      <CTASection
        id="cta-title"
        eyebrow="Plan your trip"
        title="Ready to go?"
        description="Tell us where you'd like to travel and we'll plan it around you."
        primary={{ label: "Plan your trip", href: routes.planTrip({ destination: post.destination?.name }) }}
        secondary={{ label: "Browse tours", href: routes.tours() }}
      />

      <JsonLd data={[blogPostingSchema(post), breadcrumbSchema(crumbs)].filter((x) => x !== null)} />
    </>
  );
}
