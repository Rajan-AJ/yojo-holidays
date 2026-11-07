import { cn } from "@/lib/cn";

type Props = {
  eyebrow?: string;
  title: string;
  intro?: string;
  /** Heading level. Sections on a page are h2; the page title is the only h1. */
  as?: "h2" | "h3";
  align?: "left" | "center";
  className?: string;
  id?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  intro,
  as: Tag = "h2",
  align = "left",
  className,
  id,
}: Props) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className="mb-5 text-eyebrow uppercase text-accent-strong">{eyebrow}</p>
      )}
      <Tag id={id} className="text-headline">
        {title}
      </Tag>
      {intro && <p className="mt-5 text-lg leading-relaxed text-muted">{intro}</p>}
    </div>
  );
}
