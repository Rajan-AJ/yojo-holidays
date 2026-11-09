import Link from "next/link";
import type { ImageAsset, TourScope } from "@/types/content";
import { ImageWithOverlay } from "@/components/media/image-with-overlay";
import { ArrowIcon } from "@/components/ui/button";
import { scopeLabel } from "@/lib/labels";

type Panel = { title: string; description: string; href: string; image: ImageAsset };

/**
 * Domestic | International as two full-height photographs side by side,
 * each a single large link. Stacks on mobile.
 */
export function ScopeSplit({ domestic, international }: Record<"domestic" | "international", Panel>) {
  const panels: [TourScope, Panel][] = [
    ["DOMESTIC", domestic],
    ["INTERNATIONAL", international],
  ];

  return (
    <section aria-labelledby="scope-title" className="grid bg-ink md:grid-cols-2">
      <h2 id="scope-title" className="sr-only">
        Domestic and international travel
      </h2>
      {panels.map(([scope, panel]) => (
        <ImageWithOverlay
          key={scope}
          image={panel.image}
          sizes="(min-width: 768px) 50vw, 100vw"
          scrim="bottom"
          hoverZoom
          className="group min-h-[75svh] md:min-h-[90svh]"
          contentClassName="p-gutter pb-12 sm:pb-16"
        >
          <p className="eyebrow flex items-center gap-3 text-white/85">
            <span className="rule-accent" aria-hidden="true" />
            {scopeLabel[scope]}
          </p>
          <h3 className="mt-5 max-w-[12ch] text-h1">
            <Link href={panel.href} className="after:absolute after:inset-0">
              {panel.title}
            </Link>
          </h3>
          <p className="mt-4 max-w-sm text-body-lg text-white/80">{panel.description}</p>
          <p aria-hidden="true" className="mt-8 inline-flex items-center gap-2 text-button font-medium">
            Explore {scope === "DOMESTIC" ? "India" : "the world"}
            <ArrowIcon />
          </p>
        </ImageWithOverlay>
      ))}
    </section>
  );
}
