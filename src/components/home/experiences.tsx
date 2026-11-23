import Link from "next/link";
import type { TravelCategory } from "@/types/content";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { GradientIcon, type HomeIcon } from "./icons";
import { Arrow, HomeButton, HomeHeading, HomeSection, cardClass } from "./ui";

/** Icon per travel style, matched on the category slug; unknown styles get a compass. */
function iconFor(slug: string): HomeIcon {
  const rules: [RegExp, HomeIcon][] = [
    [/honeymoon|romantic|couple/, "heart"],
    [/family|kids/, "users"],
    [/group|friends/, "users"],
    [/luxury|premium/, "star"],
    [/adventure|trek|hiking/, "mountain"],
    [/cruise|sail/, "ship"],
    [/beach|island/, "sun"],
    [/culture|heritage|pilgrim|spiritual/, "map"],
  ];
  return rules.find(([re]) => re.test(slug))?.[1] ?? "compass";
}

/** Travel styles (TourCategory) as photo tiles. */
export function Experiences({ categories }: { categories: TravelCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <HomeSection id="travel-finder" aria-labelledby="experiences-title">
      <HomeHeading
        id="experiences-title"
        eyebrow="Travel your way"
        title="Experiences for"
        accent="every traveller"
        description="Whether you're planning a romantic getaway or a family holiday, there's a journey waiting for you."
        action={
          <HomeButton href={routes.tours()} variant="outline">
            View all experiences
            <Arrow />
          </HomeButton>
        }
      />
      <Stagger as="ul" className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {categories.map((category, index) => (
          <StaggerItem as="li" key={category.id}>
            <article className={cn(cardClass, "group relative aspect-[5/4] overflow-hidden bg-brand-navy")}>
              {category.image && (
                <ResponsiveImage
                  image={category.image}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  imageClassName="transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/75 via-black/25 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-between p-5">
                <GradientIcon name={iconFor(category.id)} index={index} size="sm" />
                <div>
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-white/70">Travel style</p>
                  <h3 className="mb-0.5 font-display text-[18px] font-bold leading-tight text-white">
                    <Link href={category.href} className="after:absolute after:inset-0">
                      {category.name}
                    </Link>
                  </h3>
                  {category.description && (
                    <p className="line-clamp-2 text-[12.5px] leading-snug text-white/80">{category.description}</p>
                  )}
                  <span
                    aria-hidden="true"
                    className="mt-3 flex translate-y-2 items-center gap-1.5 text-[12.5px] font-semibold text-white opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
                  >
                    Explore packages
                    <Arrow className="size-3.5" />
                  </span>
                </div>
              </div>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </HomeSection>
  );
}
