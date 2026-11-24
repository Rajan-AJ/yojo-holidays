import Link from "next/link";
import type { ArticleSummary } from "@/types/content";
import { SampleBadge } from "@/components/ui/badge";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { Arrow, HomeButton, HomeHeading, HomeSection, cardClass, imagePillClass } from "./ui";

/** Latest Travel Journal articles as three cards. */
export function TravelGuides({ articles }: { articles: ArticleSummary[] }) {
  if (articles.length === 0) return null;

  return (
    <HomeSection tone="gray" aria-labelledby="guides-title">
      <HomeHeading
        id="guides-title"
        eyebrow="Travel journal"
        title="Travel tips and"
        accent="guides"
        description="Helpful answers for better trips, from visas to the best time to go."
        action={
          <HomeButton href={routes.journal()} variant="outline">
            View all articles
            <Arrow />
          </HomeButton>
        }
      />
      <Stagger as="ul" className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <StaggerItem as="li" key={article.id} className="flex">
            <article className={cn(cardClass, "group relative flex w-full flex-col overflow-hidden")}>
              <div className="relative h-52 overflow-hidden">
                <ResponsiveImage
                  image={article.image}
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  imageClassName="transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute left-3 top-3 flex gap-1.5">
                  {article.isSample && <SampleBadge />}
                  {article.category && <span className={imagePillClass}>{article.category.name}</span>}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                {article.publishedAt && (
                  <p className="mb-1.5 text-[12px] text-gray-400">
                    <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
                  </p>
                )}
                <h3 className="font-display text-[17px] font-bold leading-snug text-brand-navy transition-colors group-hover:text-brand-pink">
                  <Link href={article.href} className="after:absolute after:inset-0">
                    {article.title}
                  </Link>
                </h3>
                {article.excerpt && (
                  <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-gray-500">{article.excerpt}</p>
                )}
                <span
                  aria-hidden="true"
                  className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] font-semibold text-brand-pink"
                >
                  Read more
                  <Arrow className="size-3.5" />
                </span>
              </div>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </HomeSection>
  );
}
