import Link from "next/link";
import { cn } from "@/lib/cn";

export function AdminPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn("mx-auto max-w-[90rem] px-5 py-8 sm:px-8 lg:py-10", className)}>{children}</main>;
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  back,
}: {
  title: string;
  eyebrow?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="text-body-sm text-muted hover:text-ink">
            ← {back.label}
          </Link>
        )}
        {eyebrow && <p className="mt-2 text-caption font-semibold uppercase tracking-[0.14em] text-accent-strong">{eyebrow}</p>}
        <h1 className="mt-1 truncate font-display text-[1.9rem] leading-tight">{title}</h1>
        {description && <div className="mt-2 max-w-3xl text-body-sm text-muted">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

export function Card({ children, className, title, description }: { children: React.ReactNode; className?: string; title?: string; description?: string }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6", className)}>
      {title && <h2 className="text-[1.05rem] font-semibold">{title}</h2>}
      {description && <p className="mt-1 text-body-sm text-muted">{description}</p>}
      <div className={title || description ? "mt-5" : undefined}>{children}</div>
    </section>
  );
}

const statusStyles: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  draft: "bg-amber-50 text-amber-800 ring-amber-600/20",
  unpublished: "bg-slate-100 text-slate-700 ring-slate-500/20",
  archived: "bg-slate-100 text-slate-500 ring-slate-400/20",
  scheduled: "bg-sky-50 text-sky-700 ring-sky-600/20",
  open: "bg-sky-50 text-sky-700 ring-sky-600/20",
  won: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  lost: "bg-slate-100 text-slate-600 ring-slate-400/20",
  spam: "bg-rose-50 text-rose-700 ring-rose-600/20",
  high: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium capitalize ring-1 ring-inset", statusStyles[tone] ?? "bg-slate-100 text-slate-700 ring-slate-400/20")}>
      {children}
    </span>
  );
}

export const adminButton = {
  primary:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-body-sm font-semibold text-white transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-4 text-body-sm font-medium text-ink transition-colors hover:border-ink disabled:opacity-50",
  ghost: "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-body-sm text-muted hover:bg-black/5 hover:text-ink",
  danger:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-body-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50",
};

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-white/60 px-6 py-14 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-body-sm text-muted">{children}</div>}
    </div>
  );
}

export function formatAdminDate(value: unknown, withTime = false) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime && { hour: "numeric", minute: "2-digit" }),
    timeZone: "Asia/Kolkata",
  }).format(d);
}
