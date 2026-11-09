import { cn } from "@/lib/cn";

const tones = {
  canvas: "bg-canvas text-ink",
  sand: "bg-sand text-ink",
  surface: "bg-surface text-ink",
  ink: "on-dark bg-ink text-canvas",
} as const;

const spacings = {
  default: "py-section",
  compact: "py-section-sm",
  none: "",
} as const;

export type SectionTone = keyof typeof tones;

/**
 * A page section: background tone + vertical rhythm. Put a <Container> inside.
 * Pass `aria-labelledby` pointing at the section's heading so it becomes a
 * named landmark region.
 */
export function Section({
  tone = "canvas",
  spacing = "default",
  className,
  children,
  ...props
}: React.ComponentProps<"section"> & {
  tone?: SectionTone;
  spacing?: keyof typeof spacings;
}) {
  return (
    <section className={cn(tones[tone], spacings[spacing], className)} {...props}>
      {children}
    </section>
  );
}
