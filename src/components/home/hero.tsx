import Link from "next/link";
import type { ImageAsset } from "@/types/content";
import type { NavItem } from "@/config/site";
import { ImageWithOverlay } from "@/components/media/image-with-overlay";
import { Container } from "@/components/ui/container";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { routes } from "@/lib/routes";

/**
 * Cinematic opening. The media slot is a single ImageAsset today; a muted,
 * poster-first video can replace it later without changing the layout.
 * The H1 and search are plain server-rendered HTML (no animation wrapper), so
 * they paint immediately and the search works without JavaScript.
 */
export function Hero({
  title,
  description,
  image,
  primaryCta,
  popular,
  suggestions,
}: {
  title: string;
  description: string;
  image: ImageAsset;
  primaryCta: NavItem;
  popular: NavItem[];
  /** Destination names for the search box's native suggestion list. */
  suggestions: string[];
}) {
  return (
    <section aria-labelledby="hero-title">
      <ImageWithOverlay
        image={image}
        priority
        sizes="100vw"
        scrim="hero"
        className="flex min-h-svh flex-col justify-end"
      >
        <Container size="wide" className="relative pb-10 pt-[calc(var(--spacing-header)+3rem)] sm:pb-14 lg:pb-16">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-12">
            <div className="lg:col-span-7">
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

            <div className="lg:col-span-5">
              <DestinationSearch popular={popular} suggestions={suggestions} />
            </div>
          </div>
        </Container>
      </ImageWithOverlay>
    </section>
  );
}

/**
 * GET form to /search/ (works without JavaScript). The server searches
 * countries, destinations and tours; suggestions come from a native datalist.
 */
function DestinationSearch({ popular, suggestions }: { popular: NavItem[]; suggestions: string[] }) {
  return (
    <div>
      <form action={routes.search()} method="get" role="search" aria-label="Search destinations and tours">
        <label htmlFor="hero-search" className="eyebrow mb-3 block text-white/80">
          Where to?
        </label>
        <div className="flex rounded-full bg-white p-1.5 text-ink shadow-raised">
          <input
            id="hero-search"
            name="q"
            type="search"
            list="hero-search-suggestions"
            placeholder="Search a country or city"
            autoComplete="off"
            enterKeyHint="search"
            className="min-h-12 min-w-0 flex-1 rounded-full bg-transparent pl-5 pr-2 text-body placeholder:text-muted focus-visible:outline-offset-0"
          />
          <button
            type="submit"
            className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-ink px-5 text-button font-medium text-canvas transition-colors hover:bg-ink/85 sm:px-6"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-4">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <span className="sr-only sm:not-sr-only">Search</span>
          </button>
        </div>
        <datalist id="hero-search-suggestions">
          {suggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-x-1 gap-y-2">
        <p className="caption mr-2 text-white/70" id="popular-label">
          Popular
        </p>
        <ul aria-labelledby="popular-label" className="flex flex-wrap gap-2">
          {popular.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-flex min-h-9 items-center rounded-full border border-white/35 px-3.5 text-caption text-white transition-colors hover:border-white hover:bg-white/10"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
