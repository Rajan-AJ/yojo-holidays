import Link from "next/link";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary" // ink fill: the one main action in a view
  | "secondary" // white surface with hairline border
  | "outline" // transparent with border
  | "ghost" // text-only, underline on hover
  | "inverse" // white fill, for use over imagery / ink sections
  | "outline-inverse"; // light border, for use over imagery / ink sections

export type ButtonSize = "sm" | "md" | "lg";

const base =
  "group/button relative inline-flex items-center justify-center gap-2 whitespace-nowrap text-button font-medium " +
  "transition-[background-color,border-color,color,opacity,translate] duration-(--duration-base) ease-(--ease-editorial) " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
  primary: "rounded-full bg-ink text-canvas hover:bg-ink/85",
  secondary: "rounded-full border border-line-strong bg-surface text-ink hover:border-ink",
  outline: "rounded-full border border-ink/25 text-ink hover:border-ink hover:bg-ink/[0.03]",
  ghost:
    "text-ink underline decoration-ink/25 decoration-1 underline-offset-[0.4em] hover:decoration-ink",
  inverse: "rounded-full bg-white text-ink hover:bg-canvas",
  "outline-inverse":
    "rounded-full border border-white/45 text-white hover:border-white hover:bg-white/10",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-10 px-5",
  md: "min-h-12 px-7",
  lg: "min-h-14 px-9",
};

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize; className?: string };

/** Class string for anything that should look like a button. */
export function buttonVariants({ variant = "primary", size = "md", className }: StyleProps = {}) {
  // Ghost buttons are text links: keep the touch target, drop the padding.
  const sizeClass = variant === "ghost" ? "min-h-11 px-0" : sizes[size];
  return cn(base, variants[variant], sizeClass, className);
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-4 animate-spin rounded-full border-[1.5px] border-current border-r-transparent"
    />
  );
}

type ButtonProps = React.ComponentProps<"button"> &
  StyleProps & {
    /** Shows a spinner, keeps the label for screen readers, blocks repeat clicks. */
    loading?: boolean;
  };

/** A real <button>, for actions. Use ButtonLink for navigation. */
export function Button({
  variant,
  size,
  className,
  loading = false,
  disabled,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & StyleProps;

/** A link styled as a button. */
export function ButtonLink({ variant, size, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonVariants({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}

/** Small decorative arrow that nudges right on hover of the parent button/link. */
export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className={cn(
        "size-4 shrink-0 transition-transform duration-(--duration-base) ease-(--ease-editorial) group-hover/button:translate-x-0.5 group-hover:translate-x-0.5",
        className,
      )}
    >
      <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}
