import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";

/**
 * The Yojo Holidays logo, linking home.
 *
 * Source: public/brand/yojo-holidays-logo.png (transparent, 800×424), made
 * from the client's JPG (public/brand/yojo-holidays-logo.jpg). The logo is
 * navy and gold, so on dark backgrounds (header over the hero, footer) pass
 * `onDark` to place it on a white tile; otherwise the navy would disappear.
 */
export function Wordmark({
  onDark = false,
  size = "md",
  priority = false,
  className,
}: {
  onDark?: boolean;
  size?: "md" | "lg";
  /** Above-the-fold usage (header) loads eagerly. */
  priority?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name}, home`}
      className={cn(
        "inline-flex shrink-0 items-center transition-[background-color,padding,box-shadow] duration-(--duration-base)",
        onDark && "rounded-xl bg-white px-2.5 py-1.5 shadow-sm",
        className,
      )}
    >
      <Image
        src={siteConfig.logoTransparent}
        alt={`${siteConfig.name}: ${siteConfig.tagline}`}
        width={800}
        height={424}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        sizes={size === "lg" ? "200px" : "110px"}
        className={cn("w-auto", size === "lg" ? "h-20 sm:h-24" : onDark ? "h-10 sm:h-11" : "h-12 sm:h-[3.25rem]")}
      />
    </Link>
  );
}
