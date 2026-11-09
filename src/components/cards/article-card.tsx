import Link from "next/link";
import type { ArticleSummary } from "@/types/content";
import { ResponsiveImage, type AspectRatio } from "@/components/media/responsive-image";
import { SampleBadge } from "@/components/ui/badge";
import { guideCategoryLabel } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Travel Journal article teaser. `layout="feature"` is the large lead story;
 * `layout="row"` is a compact image-beside-text entry for lists.
 */
export function ArticleCard({
  article,
  layout = "stack",
  aspect = "landscape",
  sizes,
  headingLevel: Heading = "h3",
  className,
}: {
  article: ArticleSummary;
  layout?: "feature" | "stack" | "row";
  aspect?: AspectRatio;
  sizes?: string;
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  const isRow = layout === "row";

  return (
    <article
      className={cn(
        "group relative",
        isRow && "grid grid-cols-[7rem_1fr] items-start gap-5 sm:grid-cols-[10rem_1fr] sm:gap-6",
        className,
      )}
    >
      <div className="relative">
        <ResponsiveImage
          image={article.image}
          aspect={isRow ? "landscape" : aspect}
          sizes={sizes ?? (isRow ? "160px" : "(min-width: 1024px) 50vw, 100vw")}
          hoverZoom
        />
        {article.isSample && <SampleBadge className="absolute left-2 top-2" />}
      </div>

      <div className={isRow ? undefined : "mt-5"}>
        <p className="eyebrow text-accent-strong">{guideCategoryLabel[article.category]}</p>
        <Heading
          className={cn(
            "mt-3 transition-colors group-hover:text-accent-strong",
            layout === "feature" ? "text-h2" : isRow ? "text-h4" : "text-h3",
          )}
        >
          <Link href={article.href} className="after:absolute after:inset-0">
            {article.title}
          </Link>
        </Heading>
        {article.excerpt && !isRow && (
          <p className="mt-3 max-w-xl text-body text-muted">{article.excerpt}</p>
        )}
        {article.publishedAt && (
          <p className="caption mt-3 text-muted">
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          </p>
        )}
      </div>
    </article>
  );
}
