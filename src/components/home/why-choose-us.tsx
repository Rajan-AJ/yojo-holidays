import type { HomeIcon } from "./icons";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { GradientIcon } from "./icons";
import { HomeHeading, HomeSection } from "./ui";

type Principle = { icon: HomeIcon; title: string; body: string };

/** Reasons to book, as gradient-icon tiles. Statements only; no invented figures. */
export function WhyChooseUs({
  eyebrow,
  title,
  accent,
  intro,
  principles,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  intro: string;
  principles: Principle[];
}) {
  return (
    <HomeSection aria-labelledby="why-title">
      <HomeHeading id="why-title" eyebrow={eyebrow} title={title} accent={accent} description={intro} align="center" />
      <Stagger as="ul" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {principles.map((item, index) => (
          <StaggerItem
            as="li"
            key={item.title}
            className="group rounded-2xl border border-transparent bg-gray-50 p-6 transition-all duration-300 hover:border-gray-100 hover:bg-white hover:shadow-(--shadow-card)"
          >
            <GradientIcon
              name={item.icon}
              index={index}
              className="mb-4 transition-transform duration-300 group-hover:scale-110"
            />
            <h3 className="mb-2 font-display text-[17px] font-bold text-brand-navy">{item.title}</h3>
            <p className="text-[14px] leading-relaxed text-gray-500">{item.body}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </HomeSection>
  );
}
