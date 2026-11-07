import { cn } from "@/lib/cn";

/** Horizontal page gutter + max width. Every section uses this. */
export function Container({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-(--container-site) px-5 sm:px-8 lg:px-12", className)}
      {...props}
    >
      {children}
    </div>
  );
}
