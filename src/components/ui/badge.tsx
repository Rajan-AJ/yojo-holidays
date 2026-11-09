import { cn } from "@/lib/cn";

const tones = {
  neutral: "border-line-strong text-ink",
  muted: "border-transparent bg-ink/[0.05] text-muted",
  accent: "border-accent/50 text-accent-strong",
  inverse: "border-white/40 text-white",
  /** Development data marker. Deliberately loud so it is never shipped unnoticed. */
  sample: "border-dashed border-danger/60 bg-surface text-danger",
} as const;

export type BadgeTone = keyof typeof tones;

/** Small label: category, duration, status. Text, never colour alone, carries the meaning. */
export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium uppercase leading-none tracking-[0.12em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Shared marker for placeholder/sample records. */
export function SampleBadge({ className }: { className?: string }) {
  return (
    <Badge tone="sample" className={className}>
      Sample
    </Badge>
  );
}
