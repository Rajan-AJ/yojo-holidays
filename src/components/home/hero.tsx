import Link from "next/link";
import type { ImageAsset, TourScope } from "@/types/content";
import type { NavItem } from "@/config/site";
import { ImageWithOverlay } from "@/components/media/image-with-overlay";
import { Container } from "@/components/ui/container";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { TripFinder, type TripFinderCategory, type TripFinderDestination, type TripFinderPopular } from "./trip-finder";

/**
 * Cinematic opening. The media slot is a single ImageAsset today; a muted,
 * poster-first video can replace it later without changing the layout. The
 * H1 is plain server-rendered HTML (no animation wrapper) so it paints
 * immediately; the trip finder below it is a small client island.
 */
export function Hero({
  title,
  description,
  image,
  primaryCta,
  destinationsByScope,
  categories,
  trending,
}: {
  title: string;
  description: string;
  image: ImageAsset;
  primaryCta: NavItem;
  /** Top-level destinations per scope, for the finder's Destination dropdown. */
  destinationsByScope: Record<TourScope, TripFinderDestination[]>;
  categories: TripFinderCategory[];
  trending: TripFinderPopular[];
}) {
  return (
    <section aria-labelledby="hero-title" className="relative bg-white">
      <ImageWithOverlay
        image={image}
        priority
        sizes="100vw"
        scrim="hero"
        className="flex min-h-[85svh] flex-col justify-end pb-24 sm:pb-28 lg:pb-32"
      >
        <Container size="wide" className="relative pt-[calc(var(--spacing-header)+3rem)]">
          <div className="max-w-2xl">
            <h1 id="hero-title" className="type-display max-w-[11ch]">
              {title}
            </h1>
            <p className="mt-6 max-w-md text-body-lg text-white/85">{description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <ButtonLink href={primaryCta.href} variant="inverse" size="lg">
                {primaryCta.label}
                <ArrowIcon />
              </ButtonLink>
              <Link
                href="#travel-finder"
                className="inline-flex min-h-11 items-center gap-2 text-body-sm text-white/90 underline decoration-white/40 underline-offset-[0.4em] transition-colors hover:decoration-white"
              >
                Find your kind of trip
              </Link>
            </div>
          </div>
        </Container>
      </ImageWithOverlay>

      {/* Straddles the image/next-section boundary: pulled up just enough for
          its top edge to overlap the photo, most of the card sitting below it.
          Narrower than the hero text above it so it reads as its own card. */}
      <Container size="site" className="relative z-10 -mt-10 sm:-mt-12 lg:-mt-14">
        <TripFinder destinationsByScope={destinationsByScope} categories={categories} trending={trending} />
      </Container>
    </section>
  );
}
