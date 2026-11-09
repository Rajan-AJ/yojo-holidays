import type { ImageAsset } from "@/types/content";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { padNumber } from "@/lib/format";

export type Principle = { title: string; body: string };

/**
 * Trust through clear statements and typography, not icons or counters.
 * Add figures (years, travellers) only when the client supplies real ones.
 */
export function WhyUs({
  title,
  intro,
  principles,
  image,
}: {
  title: string;
  intro: string;
  principles: Principle[];
  image: ImageAsset;
}) {
  return (
    <Section aria-labelledby="why-title">
      <Container size="wide">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal variant="imageReveal" className="lg:col-span-5">
            <ResponsiveImage
              image={image}
              aspect="tall"
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="lg:sticky lg:top-[calc(var(--spacing-header)+2rem)]"
            />
          </Reveal>

          <div className="lg:col-span-6 lg:col-start-7">
            <p className="eyebrow flex items-center gap-3 text-accent-strong">
              <span className="rule-accent" aria-hidden="true" />
              Why Yojo
            </p>
            <h2 id="why-title" className="type-display mt-6">
              {title}
            </h2>
            <p className="mt-6 max-w-lg text-body-lg text-muted">{intro}</p>

            <Stagger as="ol" className="mt-block">
              {principles.map((item, index) => (
                <StaggerItem
                  as="li"
                  key={item.title}
                  className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-line py-8 sm:grid-cols-[4rem_1fr]"
                >
                  <span aria-hidden="true" className="caption pt-2 tabular-nums text-muted">
                    {padNumber(index + 1)}
                  </span>
                  <div>
                    <h3 className="text-h3">{item.title}</h3>
                    <p className="mt-3 max-w-md text-body text-muted">{item.body}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </Container>
    </Section>
  );
}
