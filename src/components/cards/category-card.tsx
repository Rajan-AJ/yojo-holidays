import Link from "next/link";
import type { TravelCategory } from "@/types/content";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { ArrowIcon } from "@/components/ui/button";
import { padNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Travel-style entry, typographic first: index number, serif name, one line
 * of description, and a small photograph. Deliberately not an icon tile.
 */
export function CategoryCard({
  category,
  index,
  headingLevel: Heading = "h3",
  className,
}: {
  category: TravelCategory;
  /** 1-based position, shown as "01". */
  index: number;
  headingLevel?: "h3" | "h4";
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 border-t border-line py-6 sm:gap-8",
        className,
      )}
    >
      <div className="flex gap-5 sm:gap-7">
        <span aria-hidden="true" className="caption pt-2 tabular-nums text-muted">
          {padNumber(index)}
        </span>
        <div>
          <Heading className="text-h3 transition-colors duration-(--duration-base) group-hover:text-accent-strong">
            <Link href={category.href} className="after:absolute after:inset-0">
              {category.name}
            </Link>
          </Heading>
          <p className="mt-1.5 max-w-xs text-body-sm text-muted">{category.description}</p>
        </div>
      </div>

      {category.image ? (
        <ResponsiveImage
          image={category.image}
          aspect="landscape"
          sizes="128px"
          hoverZoom
          className="w-24 sm:w-32"
        />
      ) : (
        <ArrowIcon className="size-5 text-muted group-hover:text-ink" />
      )}
    </article>
  );
}
