"use client";

import { m } from "motion/react";
import { staggerChildren, variants, type RevealVariant } from "@/lib/motion";

type Tag = "div" | "li" | "ul" | "ol" | "figure" | "article";

const viewport = { once: true, margin: "0px 0px -12% 0px" } as const;

/**
 * Animates its children into view once, when scrolled to.
 * The content is server-rendered, so it is in the HTML for crawlers; a
 * <noscript> rule in the site layout keeps it visible without JavaScript.
 * Never wrap the hero / LCP element in this.
 */
export function Reveal({
  as = "div",
  variant = "fadeUp",
  className,
  children,
}: {
  as?: Tag;
  variant?: RevealVariant;
  className?: string;
  children: React.ReactNode;
}) {
  const Component = m[as];
  return (
    <Component
      data-reveal=""
      className={className}
      variants={variants[variant]}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
    >
      {children}
    </Component>
  );
}

/** Parent that staggers its <StaggerItem> children as they enter the viewport. */
export function Stagger({
  as = "div",
  className,
  children,
}: {
  as?: Tag;
  className?: string;
  children: React.ReactNode;
}) {
  const Component = m[as];
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={{ visible: { transition: { staggerChildren } } }}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({
  as = "div",
  variant = "fadeUp",
  className,
  children,
}: {
  as?: Tag;
  variant?: RevealVariant;
  className?: string;
  children: React.ReactNode;
}) {
  const Component = m[as];
  return (
    <Component data-reveal="" className={className} variants={variants[variant]}>
      {children}
    </Component>
  );
}
