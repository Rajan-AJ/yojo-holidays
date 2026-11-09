"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

/**
 * Loads Motion's small DOM feature set once (LazyMotion + `m` components keep
 * the bundle far smaller than `motion.*`). `strict` throws if a full `motion`
 * component sneaks in. `reducedMotion="user"` turns transforms off for people
 * who ask the OS for reduced motion; opacity fades stay, content stays visible.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
