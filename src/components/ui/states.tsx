import { cn } from "@/lib/cn";

/**
 * Loading, empty and error states. Quiet and typographic: they explain what
 * happened and offer one next step via `action`.
 */

type StateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

function StateFrame({
  title,
  description,
  action,
  className,
  role,
  headingLevel: Heading = "h2",
}: StateProps & { role?: "status" | "alert"; headingLevel?: "h2" | "h3" }) {
  return (
    <div
      role={role}
      className={cn(
        "flex flex-col items-center border-y border-line px-6 py-16 text-center",
        className,
      )}
    >
      <Heading className="text-h4">{title}</Heading>
      {description && <p className="mt-3 max-w-md text-body-sm text-muted">{description}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}

/** Skeleton blocks + a polite announcement. Use inside Suspense fallbacks. */
export function LoadingState({
  label = "Loading",
  rows = 3,
  className,
}: {
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={cn("space-y-4", className)}>
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-4 animate-pulse rounded-card bg-ink/[0.07]"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function EmptyState(props: StateProps & { headingLevel?: "h2" | "h3" }) {
  return <StateFrame role="status" {...props} />;
}

export function ErrorState(props: StateProps & { headingLevel?: "h2" | "h3" }) {
  return <StateFrame role="alert" {...props} />;
}
