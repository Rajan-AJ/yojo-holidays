import type { ImageAsset } from "@/types/content";
import type { NavItem } from "@/config/site";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Icon } from "./icons";
import { Arrow, Eyebrow, HomeButton } from "./ui";

/** Closing call to action over a navy-tinted photograph. */
export function FinalCta({
  image,
  primary,
  secondary,
  points,
}: {
  image: ImageAsset;
  primary: NavItem;
  secondary: NavItem;
  points: string[];
}) {
  return (
    <section aria-labelledby="final-cta-title" className="on-dark relative isolate overflow-hidden py-24">
      <ResponsiveImage image={image} sizes="100vw" className="-z-20" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-brand-navy/85" />
      <div aria-hidden="true" className="absolute left-1/4 top-0 -z-10 size-80 rounded-full bg-brand-pink/20 blur-3xl" />
      <div aria-hidden="true" className="absolute bottom-0 right-1/4 -z-10 size-72 rounded-full bg-brand-teal/15 blur-3xl" />

      <div className="mx-auto max-w-3xl px-6 text-center">
        <Eyebrow align="center" className="mb-4">
          Your next adventure awaits
        </Eyebrow>
        <h2
          id="final-cta-title"
          className="mb-5 font-display text-[2.25rem] font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl"
        >
          Ready to plan your <span className="text-brand-pink">dream holiday?</span>
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-[16px] leading-relaxed text-white/75">
          Tell us where you want to go. We&apos;ll help you plan the rest, from flights and hotels to visas.
        </p>
        <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <HomeButton href={primary.href} size="lg" className="h-[54px] px-9">
            {primary.label}
            <Arrow />
          </HomeButton>
          <HomeButton href={secondary.href} variant="outline-light" size="lg" className="h-[54px] px-9">
            {secondary.label}
          </HomeButton>
        </div>
        <ul className="flex flex-wrap items-center justify-center gap-3">
          {points.map((point) => (
            <li
              key={point}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[13px] font-medium text-white/85 backdrop-blur-sm"
            >
              <Icon name="check" className="size-4 text-brand-teal" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
