import Link from "next/link";
import { JsonLd } from "@/lib/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { cn } from "@/lib/cn";

export type Crumb = { name: string; href: string };

/**
 * Visible breadcrumb trail + matching BreadcrumbList schema.
 * Pass the full trail including the current page as the last item.
 */
export function Breadcrumbs({
  items,
  inverse = false,
  className,
}: {
  items: Crumb[];
  inverse?: boolean;
  className?: string;
}) {
  if (items.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("caption", className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-2">
              {isLast ? (
                <span aria-current="page" className={inverse ? "text-white" : "text-ink"}>
                  {item.name}
                </span>
              ) : (
                <>
                  <Link
                    href={item.href}
                    className={cn(
                      "underline-offset-4 hover:underline",
                      inverse ? "text-white/75" : "text-muted",
                    )}
                  >
                    {item.name}
                  </Link>
                  <span aria-hidden="true" className={inverse ? "text-white/40" : "text-line-strong"}>
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
      <JsonLd data={breadcrumbSchema(items)} />
    </nav>
  );
}
