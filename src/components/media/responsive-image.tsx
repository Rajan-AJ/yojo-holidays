import Image from "next/image";
import type { ImageAsset } from "@/types/content";
import { cn } from "@/lib/cn";

/** Named aspect ratios so compositions stay consistent across the site. */
export const aspectRatios = {
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  tall: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  wide: "aspect-[16/10]",
  cinema: "aspect-[21/9]",
} as const;

export type AspectRatio = keyof typeof aspectRatios;

type Props = {
  image: ImageAsset;
  /**
   * Fixed aspect ratio box (prevents layout shift). Omit when the parent
   * already has a size, e.g. a full-height hero; the image then fills it.
   */
  aspect?: AspectRatio;
  /**
   * How wide the image renders at each breakpoint, so the browser downloads
   * the right size. Always set this; the default assumes full viewport width.
   */
  sizes?: string;
  /** For the LCP image only (hero). Everything else lazy-loads. */
  priority?: boolean;
  /** Subtle zoom when an ancestor with `group` is hovered (cards). */
  hoverZoom?: boolean;
  className?: string;
  imageClassName?: string;
};

/**
 * The site's image primitive: next/image (AVIF/WebP, responsive srcset, lazy
 * loading) inside a fixed-ratio frame with a neutral background while loading.
 */
export function ResponsiveImage({
  image,
  aspect,
  sizes = "100vw",
  priority = false,
  hoverZoom = false,
  className,
  imageClassName,
}: Props) {
  return (
    <div
      className={cn(
        "overflow-hidden bg-sand",
        // Without a ratio the image fills its (positioned) parent.
        aspect ? cn("relative", aspectRatios[aspect]) : "absolute inset-0",
        className,
      )}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        // Next 16: `priority` is deprecated; eager + high fetch priority instead.
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        placeholder={image.blurDataURL ? "blur" : "empty"}
        blurDataURL={image.blurDataURL}
        className={cn(
          "object-cover",
          hoverZoom &&
            "transition-transform duration-(--duration-slow) ease-(--ease-editorial) group-hover:scale-[1.03]",
          imageClassName,
        )}
      />
    </div>
  );
}
