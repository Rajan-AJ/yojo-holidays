import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Building blocks for the homepage sections below the hero (bold card layout:
 * navy headings, pink accents, Space Grotesk display type).
 */

const tones = {
  white: "bg-white",
  gray: "bg-[#f8f8fb]",
  navy: "on-dark bg-brand-navy text-white",
} as const;

export function HomeSection({
  tone = "white",
  className,
  children,
  ...props
}: React.ComponentProps<"section"> & { tone?: keyof typeof tones }) {
  return (
    <section className={cn("py-16 sm:py-20", tones[tone], className)} {...props}>
      <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-6 lg:px-11">{children}</div>
    </section>
  );
}

export function Eyebrow({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-brand-pink",
        className,
      )}
    >
      <span aria-hidden="true" className="h-px w-5 bg-brand-pink" />
      {children}
      {align === "center" && <span aria-hidden="true" className="h-px w-5 bg-brand-pink" />}
    </p>
  );
}

/** Eyebrow + title (with an optional pink accent phrase) + description, and an optional action. */
export function HomeHeading({
  id,
  eyebrow,
  title,
  accent,
  description,
  align = "left",
  light = false,
  action,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  /** Second part of the title, shown in pink. */
  accent?: string;
  description?: string;
  align?: "left" | "center";
  light?: boolean;
  action?: React.ReactNode;
  className?: string;
}) {
  const heading = (
    <div className={cn("flex max-w-2xl flex-col", align === "center" ? "mx-auto items-center text-center" : "items-start")}>
      <Eyebrow align={align}>{eyebrow}</Eyebrow>
      <h2
        id={id}
        className={cn(
          "font-display text-3xl font-bold tracking-tight sm:text-4xl",
          light ? "text-white" : "text-brand-navy",
        )}
      >
        {title}
        {accent && (
          <>
            {" "}
            <span className="text-brand-pink">{accent}</span>
          </>
        )}
      </h2>
      {description && (
        <p className={cn("mt-3 max-w-xl text-base", light ? "text-white/70" : "text-gray-500")}>{description}</p>
      )}
    </div>
  );

  if (!action) return <div className={cn("mb-10 sm:mb-12", className)}>{heading}</div>;

  return (
    <div className={cn("mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end", className)}>
      {heading}
      <div className="shrink-0">{action}</div>
    </div>
  );
}

const buttonBase =
  "group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200";

const buttonVariants = {
  pink: "bg-brand-pink text-white shadow-(--shadow-btn-pink) hover:-translate-y-0.5 hover:bg-brand-pink-dark",
  navy: "bg-brand-navy text-white hover:bg-brand-navy-mid",
  outline: "border-2 border-brand-navy/20 text-brand-navy hover:border-brand-pink hover:text-brand-pink",
  "outline-light": "border-2 border-white/40 text-white hover:border-white hover:bg-white/10",
  whatsapp: "bg-whatsapp text-white hover:-translate-y-0.5 hover:brightness-95",
} as const;

const buttonSizes = {
  sm: "h-10 px-4 text-[13px]",
  md: "h-11 px-6 text-[14px]",
  lg: "h-[52px] px-8 text-[15px]",
} as const;

type HomeButtonStyleProps = { variant?: keyof typeof buttonVariants; size?: keyof typeof buttonSizes; className?: string };

/** Class string for anything that should look like a bold homepage button (e.g. a real <button>). */
export function homeButtonClassName({ variant = "pink", size = "md", className }: HomeButtonStyleProps = {}) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

export function HomeButton({
  variant,
  size,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & HomeButtonStyleProps) {
  return (
    <Link className={homeButtonClassName({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}

export function Arrow({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className={cn("size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5", className)}
    >
      <path d="M3 8h9M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Shared lifted-card classes. */
export const cardClass =
  "rounded-2xl bg-white shadow-(--shadow-card) transition-all duration-300 hover:-translate-y-1 hover:shadow-(--shadow-card-hover)";

/** Small white pill over imagery. */
export const imagePillClass =
  "rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-brand-navy backdrop-blur-sm";
