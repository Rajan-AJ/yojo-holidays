import { cn } from "@/lib/cn";

type Props = {
  eyebrow?: string;
  title: string;
  intro?: string;
  /** Heading level. Sections on a page are h2; the page title is the only h1. */
  as?: "h1" | "h2" | "h3";
  align?: "left" | "center";
  /** Light text for dark sections or imagery. */
  inverse?: boolean;
  /** Optional action (e.g. "View all") shown beside the heading on wide screens. */
  action?: React.ReactNode;
  className?: string;
  id?: string;
};

const sizeFor = { h1: "text-h1", h2: "text-h2", h3: "text-h3" } as const;

export function SectionHeading({
  eyebrow,
  title,
  intro,
  as: Tag = "h2",
  align = "left",
  inverse = false,
  action,
  className,
  id,
}: Props) {
  const heading = (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && (
        <p
          className={cn(
            "eyebrow mb-5 flex items-center gap-3",
            align === "center" && "justify-center",
            inverse ? "text-accent" : "text-accent-strong",
          )}
        >
          <span className="rule-accent" aria-hidden="true" />
          {eyebrow}
        </p>
      )}
      <Tag id={id} className={sizeFor[Tag]}>
        {title}
      </Tag>
      {intro && (
        <p className={cn("mt-5 text-body-lg", inverse ? "text-canvas/70" : "text-muted")}>
          {intro}
        </p>
      )}
    </div>
  );

  if (!action) return <div className={className}>{heading}</div>;

  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12",
        className,
      )}
    >
      {heading}
      <div className="shrink-0">{action}</div>
    </div>
  );
}
