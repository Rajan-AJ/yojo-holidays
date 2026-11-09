import type { ImageAsset } from "@/types/content";
import { cn } from "@/lib/cn";
import { ResponsiveImage, aspectRatios, type AspectRatio } from "./responsive-image";

const scrims = {
  /** Darkens the lower part only, where text sits. */
  bottom: "bg-linear-to-t from-ink/80 via-ink/25 to-transparent",
  /** Even tint for text placed anywhere. */
  full: "bg-ink/45",
  /** Top and bottom, for a header above and text below (heroes). */
  hero: "bg-linear-to-b from-ink/40 via-ink/5 to-ink/80",
} as const;

/**
 * An image with a legibility scrim and content laid over it. The scrim exists
 * for contrast, not decoration: keep text on the darkened area.
 *
 * Size comes from `aspect` or from `className` (e.g. min-h-svh). Content sits
 * in normal flow at the bottom, so on short screens the panel grows to fit
 * instead of clipping text.
 */
export function ImageWithOverlay({
  image,
  aspect,
  sizes,
  priority,
  scrim = "bottom",
  hoverZoom,
  className,
  contentClassName,
  children,
}: {
  image: ImageAsset;
  aspect?: AspectRatio;
  sizes?: string;
  priority?: boolean;
  scrim?: keyof typeof scrims;
  hoverZoom?: boolean;
  className?: string;
  contentClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "on-dark relative isolate flex flex-col overflow-hidden text-white",
        aspect && aspectRatios[aspect],
        className,
      )}
    >
      <ResponsiveImage
        image={image}
        sizes={sizes}
        priority={priority}
        hoverZoom={hoverZoom}
        className="-z-10"
      />
      <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 -z-10", scrims[scrim])} />
      {children && (
        <div className={cn("flex flex-1 flex-col justify-end", contentClassName)}>{children}</div>
      )}
    </div>
  );
}
