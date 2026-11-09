import type { ReviewView } from "@/types/content";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ReviewCard } from "@/components/cards/review-card";
import { Stagger, StaggerItem } from "@/components/motion/reveal";

/** Renders nothing when there are no published reviews: no filler testimonials. */
export function TravellerStories({
  reviews,
  id = "stories-title",
  title = "They went. They loved it. They came back with stories.",
}: {
  reviews: ReviewView[];
  id?: string;
  title?: string;
}) {
  if (reviews.length === 0) return null;

  return (
    <Section tone="surface" aria-labelledby={id}>
      <Container size="wide">
        <SectionHeading id={id} eyebrow="Traveller stories" title={title} />
        <Stagger as="ul" className="mt-block grid gap-12 md:grid-cols-3 md:gap-10">
          {reviews.map((review) => (
            <StaggerItem as="li" key={review.id}>
              <ReviewCard review={review} />
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </Section>
  );
}
