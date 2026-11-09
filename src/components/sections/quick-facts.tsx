import { cn } from "@/lib/cn";

export type Fact = { label: string; value: React.ReactNode };

/**
 * Key facts as a description list (label / value). Facts without a value are
 * dropped, so callers can pass optional data directly. Renders nothing when
 * no fact has a value.
 */
export function QuickFacts({
  facts,
  inverse = false,
  className,
}: {
  facts: (Fact | false | null | undefined)[];
  inverse?: boolean;
  className?: string;
}) {
  const present = facts.filter(
    (f): f is Fact => Boolean(f) && (f as Fact).value !== undefined && (f as Fact).value !== null && (f as Fact).value !== "",
  );
  if (present.length === 0) return null;

  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-8 gap-y-6 sm:flex sm:flex-wrap sm:gap-x-12",
        className,
      )}
    >
      {present.map((fact) => (
        <div key={fact.label} className="min-w-0">
          <dt className={cn("eyebrow", inverse ? "text-white/70" : "text-muted")}>{fact.label}</dt>
          <dd className="mt-2 font-serif text-h4">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
