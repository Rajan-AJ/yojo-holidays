import type { NavItem } from "@/config/site";
import { Container } from "@/components/ui/container";
import { Section, type SectionTone } from "@/components/ui/section";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/cn";

/**
 * Call to action: one statement, one line of copy, a primary and an optional
 * secondary action. Nothing else competes for attention.
 */
export function CTASection({
  id,
  eyebrow,
  title,
  description,
  primary,
  secondary,
  tone = "canvas",
}: {
  /** Heading id; the section is labelled by it. */
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  primary: NavItem;
  secondary?: NavItem;
  tone?: SectionTone;
}) {
  const dark = tone === "ink";

  return (
    <Section tone={tone} aria-labelledby={id}>
      <Container>
        <Reveal className="mx-auto max-w-3xl text-center">
          {eyebrow && (
            <p className={cn("eyebrow", dark ? "text-accent" : "text-accent-strong")}>{eyebrow}</p>
          )}
          <h2 id={id} className="type-display mt-6">
            {title}
          </h2>
          {description && (
            <p
              className={cn(
                "mx-auto mt-6 max-w-lg text-body-lg",
                dark ? "text-canvas/70" : "text-muted",
              )}
            >
              {description}
            </p>
          )}
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <ButtonLink href={primary.href} variant={dark ? "inverse" : "primary"} size="lg">
              {primary.label}
              <ArrowIcon />
            </ButtonLink>
            {secondary && (
              <ButtonLink
                href={secondary.href}
                variant={dark ? "outline-inverse" : "outline"}
                size="lg"
              >
                {secondary.label}
              </ButtonLink>
            )}
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
