import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost-light";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-canvas hover:bg-ink/85",
  secondary: "border border-ink/20 text-ink hover:border-ink",
  "ghost-light": "border border-white/40 text-white hover:border-white hover:bg-white/10",
};

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium tracking-wide transition-colors duration-300 ease-(--ease-editorial)";

/** A link styled as a button. Use a real <button> for actions, this for navigation. */
export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)} {...props}>
      {children}
    </Link>
  );
}

export const buttonClasses = (variant: Variant = "primary", className?: string) =>
  cn(base, variants[variant], className);
