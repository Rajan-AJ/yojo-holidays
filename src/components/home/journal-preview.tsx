import Link from "next/link";
import type { ArticleSummary, GuideCategory } from "@/types/content";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { ArticleCard } from "@/components/cards/article-card";
import { Reveal } from "@/components/motion/reveal";
import { guideCategoryNavLabel } from "@/lib/labels";
import { routes } from "@/lib/routes";

/** Lead story + a short list, with category links into the Journal. */
export function JournalPreview({
  articles,
  categories = [],
  id = "journal-title",
  eyebrow = "The Travel Journal",
  title = "Helpful answers for better trips.",
}: {
  articles: ArticleSummary[];
  categories?: GuideCategory[];
  id?: string;
  eyebrow?: string;
  title?: string;
}) {
  if (articles.length === 0) return null;
  const [lead, ...rest] = articles;

  return (
    <Section aria-labelledby={id}>
      <Container size="wide">
        <SectionHeading
          id={id}
          eyebrow={eyebrow}
          title={title}
          action={
            <ButtonLink href={routes.journal()} variant="ghost">
              Visit the Journal
              <ArrowIcon />
            </ButtonLink>
          }
        />

        {categories.length > 0 && (
        <nav aria-label="Journal topics" className="mt-8">
          <ul className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <li key={category}>
                <Link
                  href={routes.journalCategory(category)}
                  className="inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 text-body-sm transition-colors hover:border-ink"
                >
                  {guideCategoryNavLabel[category]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        )}

        <div className="mt-block grid gap-14 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-7">
            <ArticleCard
              article={lead}
              layout="feature"
              aspect="wide"
              sizes="(min-width: 1024px) 55vw, 100vw"
            />
          </Reveal>
          {rest.length > 0 && (
            <ul className="divide-y divide-line border-y border-line lg:col-span-5">
              {rest.map((article) => (
                <li key={article.id} className="py-6">
                  <ArticleCard article={article} layout="row" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </Section>
  );
}
