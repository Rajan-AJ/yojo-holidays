import type { TravelCategory } from "@/types/content";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { CategoryCard } from "@/components/cards/category-card";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { routes } from "@/lib/routes";

export function TravelFinder({ categories }: { categories: TravelCategory[] }) {
  return (
    <Section id="travel-finder" aria-labelledby="travel-finder-title">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-[calc(var(--spacing-header)+2rem)]">
              <SectionHeading
                id="travel-finder-title"
                eyebrow="Travel Finder"
                title="Not sure where to go?"
                intro="Start with the kind of trip you want. We'll show you where it leads."
              />
              <ButtonLink href={routes.planTrip()} variant="ghost" className="mt-6">
                Or tell us your idea
                <ArrowIcon />
              </ButtonLink>
            </div>
          </div>

          <Stagger as="ul" className="grid border-b border-line md:grid-cols-2 md:gap-x-10 lg:col-span-8 lg:grid-cols-1 xl:grid-cols-2">
            {categories.map((category, index) => (
              <StaggerItem as="li" key={category.id}>
                <CategoryCard category={category} index={index + 1} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Container>
    </Section>
  );
}
