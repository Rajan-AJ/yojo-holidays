import type { Transition, Variants } from "motion/react";

/**
 * Motion presets. Subtle, fast, purposeful: small distances, one easing curve
 * (matches --ease-editorial in globals.css), no bounce.
 */
export const ease = [0.22, 1, 0.36, 1] as const;

export const transitions = {
  base: { duration: 0.6, ease } satisfies Transition,
  slow: { duration: 0.9, ease } satisfies Transition,
} as const;

export const variants = {
  fadeUp: {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: transitions.base },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: transitions.base },
  },
  /** Image uncovers from the bottom edge. */
  imageReveal: {
    hidden: { opacity: 0, clipPath: "inset(12% 0% 0% 0%)", scale: 1.04 },
    visible: {
      opacity: 1,
      clipPath: "inset(0% 0% 0% 0%)",
      scale: 1,
      transition: transitions.slow,
    },
  },
} satisfies Record<string, Variants>;

export type RevealVariant = keyof typeof variants;

/** Delay between children of a <Stagger>. */
export const staggerChildren = 0.08;
