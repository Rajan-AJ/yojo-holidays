import type { ImageAsset } from "@/types/content";
import { ImageWithOverlay } from "@/components/media/image-with-overlay";
import { Container } from "@/components/ui/container";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { SampleBadge } from "@/components/ui/badge";

/**
 * Hero for destination, package and listing pages: photograph (or ink when
 * there is none), breadcrumbs, eyebrow, the page's only H1, an intro line,
 * optional facts and actions. All server-rendered.
 */
export function PageHero({
  title,
  eyebrow,
  intro,
  image,
  breadcrumbs,
  isSample,
  meta,
  actions,
  size = "large",
}: {
  title: string;
  eyebrow?: string;
  intro?: string;
  image?: ImageAsset;
  breadcrumbs: Crumb[];
  isSample?: boolean;
  /** Small facts row under the intro (duration, price...). */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  size?: "large" | "compact";
}) {
  const content = (
    <Container size="wide" className="relative pb-12 pt-[calc(var(--spacing-header)+1.5rem)] sm:pb-16">
      <Breadcrumbs items={breadcrumbs} inverse className="mb-auto" />
      <div className="mt-16 max-w-4xl sm:mt-24">
        <div className="flex flex-wrap items-center gap-3">
          {eyebrow && <p className="eyebrow text-white/85">{eyebrow}</p>}
          {isSample && <SampleBadge />}
        </div>
        <h1 className="mt-5 text-h1">{title}</h1>
        {intro && <p className="mt-5 max-w-2xl text-body-lg text-white/85">{intro}</p>}
        {meta && <div className="mt-8">{meta}</div>}
        {actions && <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">{actions}</div>}
      </div>
    </Container>
  );

  const minHeight = size === "large" ? "min-h-[78svh]" : "min-h-[56svh]";

  if (!image) {
    return (
      <section aria-label="Introduction" className={`on-dark flex flex-col justify-end bg-ink text-white ${minHeight}`}>
        {content}
      </section>
    );
  }

  return (
    <section aria-label="Introduction">
      <ImageWithOverlay image={image} priority sizes="100vw" scrim="hero" className={minHeight}>
        {content}
      </ImageWithOverlay>
    </section>
  );
}
