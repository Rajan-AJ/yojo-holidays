import type { HomeIcon } from "./icons";
import type { NavItem } from "@/config/site";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { Icon } from "./icons";
import { Arrow, HomeButton, HomeHeading, HomeSection } from "./ui";

type Step = { icon: HomeIcon; title: string; body: string };

/** Numbered booking steps joined by a line on wide screens. */
export function JourneySteps({
  eyebrow,
  title,
  accent,
  intro,
  steps,
  cta,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  intro: string;
  steps: Step[];
  cta: NavItem;
}) {
  return (
    <HomeSection tone="gray" aria-labelledby="steps-title">
      <HomeHeading id="steps-title" eyebrow={eyebrow} title={title} accent={accent} description={intro} align="center" />

      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute left-[calc(10%+28px)] right-[calc(10%+28px)] top-7 hidden h-px bg-linear-to-r from-transparent via-brand-pink/30 to-transparent lg:block"
        />
        <Stagger as="ol" className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {steps.map((step, index) => (
            <StaggerItem as="li" key={step.title} className="group flex flex-col items-center text-center">
              <span className="relative mb-5 flex size-14 items-center justify-center rounded-full border-2 border-brand-pink/30 bg-white text-brand-pink shadow-sm transition-colors duration-300 group-hover:border-brand-pink">
                <Icon name={step.icon} />
                <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-brand-pink text-[10px] font-bold text-white">
                  <span className="sr-only">Step </span>
                  {index + 1}
                </span>
              </span>
              <h3 className="mb-2 font-display text-[16px] font-bold leading-tight text-brand-navy">{step.title}</h3>
              <p className="max-w-60 text-[13px] leading-relaxed text-gray-500">{step.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>

      <div className="mt-12 text-center">
        <HomeButton href={cta.href} size="lg">
          Start your journey
          <Arrow />
        </HomeButton>
        <p className="mt-3 text-[13px] text-gray-400">Free consultation. No commitment required.</p>
      </div>
    </HomeSection>
  );
}
