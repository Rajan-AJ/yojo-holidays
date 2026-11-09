import { cn } from "@/lib/cn";

const widths = {
  narrow: "max-w-narrow", // long-form reading
  standard: "max-w-standard", // forms, text-led sections
  site: "max-w-site", // default
  wide: "max-w-wide", // image-led layouts
  full: "max-w-none", // edge to edge, still with gutters
} as const;

export type ContainerSize = keyof typeof widths;

/**
 * Horizontal gutter + max width. Every section uses this instead of its own
 * margins, so page edges line up everywhere.
 */
export function Container({
  size = "site",
  bleed = false,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  size?: ContainerSize;
  /** Drop the side gutters on mobile only (for edge-to-edge imagery). */
  bleed?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        widths[size],
        bleed ? "sm:px-gutter" : "px-gutter",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
