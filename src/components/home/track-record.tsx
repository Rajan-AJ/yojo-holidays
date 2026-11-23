import type { HomeIcon } from "./icons";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { HomeHeading, HomeSection, cardClass } from "./ui";
import { GradientIcon } from "./icons";
import { CountUp } from "./count-up";
import { cn } from "@/lib/cn";

export type Stat = { icon: HomeIcon; value: number; suffix?: string; label: string; sublabel?: string };

/** Animated figures. Only real numbers reach this (database counts or client-confirmed figures). */
export function TrackRecord({ stats }: { stats: Stat[] }) {
  if (stats.length === 0) return null;

  return (
    <HomeSection aria-labelledby="trust-title">
      <HomeHeading
        id="trust-title"
        eyebrow="Our track record"
        title="Your trusted partner for"
        accent="every journey"
        description="Holidays in India and around the world, with the planning, bookings and visa guidance handled by one team."
        align="center"
      />
      <Stagger
        as="ul"
        className={cn(
          "grid grid-cols-2 gap-4",
          stats.length >= 5 ? "lg:grid-cols-3 xl:grid-cols-6" : stats.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4",
        )}
      >
        {stats.map((stat, index) => (
          <StaggerItem as="li" key={stat.label} className={cn(cardClass, "flex flex-col gap-4 border border-gray-100 p-6")}>
            <GradientIcon name={stat.icon} index={index} />
            <div>
              <p className="mb-1 font-display text-[2.2rem] font-extrabold leading-none tracking-tight text-brand-navy">
                <CountUp value={stat.value} suffix={stat.suffix} delay={index * 80} />
              </p>
              <p className="text-[15px] font-semibold text-brand-navy">{stat.label}</p>
              {stat.sublabel && <p className="mt-0.5 text-[12.5px] text-gray-400">{stat.sublabel}</p>}
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </HomeSection>
  );
}
