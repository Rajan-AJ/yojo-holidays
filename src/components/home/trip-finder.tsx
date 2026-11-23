"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TourScope } from "@/types/content";
import { priceCeilings } from "@/components/listing/filters";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { Icon, type HomeIcon } from "./icons";
import { homeButtonClassName } from "./ui";

export type TripFinderDestination = { id: string; name: string; href: string };
export type TripFinderCategory = { id: string; name: string };
export type TripFinderPopular = { label: string; href: string };

const scopeTabs: { key: TourScope; label: string; icon: HomeIcon }[] = [
  { key: "DOMESTIC", label: "Domestic", icon: "map" },
  { key: "INTERNATIONAL", label: "International", icon: "globe" },
];

const budgetOptions = priceCeilings.map((p) => ({ value: String(p), label: `Up to ${formatPrice(p, "INR")}` }));

/** The next 12 calendar months, for the Travel Month field. */
function upcomingMonths(count = 12) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    };
  });
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="eyebrow mb-2 block text-muted">
      {children}
    </label>
  );
}

/** A select styled to this card's spec: leading icon, soft rounded corners, no native chrome. */
function FinderSelect({
  label,
  icon,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  icon: HomeIcon;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Icon name={icon} className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-line-strong bg-white pl-10 pr-9 text-body-sm text-ink transition-colors hover:border-ink/40 focus-visible:border-ink focus-visible:outline-none"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          fill="none"
          className="pointer-events-none absolute right-3.5 top-1/2 size-3 -translate-y-1/2 text-muted"
        >
          <path d="M2 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </div>
    </div>
  );
}

function AdultsField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <FieldLabel>Adults</FieldLabel>
      <div className="flex h-12 items-center gap-2 rounded-xl border border-line-strong bg-white px-3">
        <Icon name="users" className="size-4 shrink-0 text-muted" />
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          aria-label="Fewer adults"
          className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink transition-colors hover:border-ink disabled:opacity-30"
        >
          −
        </button>
        <span className="flex-1 text-center text-body-sm font-medium text-ink" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(10, value + 1))}
          disabled={value >= 10}
          aria-label="More adults"
          className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink transition-colors hover:border-ink disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * The hero's trip finder: a tabbed card (Domestic / International, Visa
 * Services is a plain link out) that sends the visitor straight to a
 * destination page when one is picked, or to the matching filtered listing
 * otherwise. Travel month and adult count ride along as extra context in the
 * URL - nothing downstream filters by them yet, so they're never presented
 * as narrowing the results.
 */
export function TripFinder({
  destinationsByScope,
  categories,
  trending,
}: {
  destinationsByScope: Record<TourScope, TripFinderDestination[]>;
  categories: TripFinderCategory[];
  trending: TripFinderPopular[];
}) {
  const router = useRouter();
  // Computed client-side only: `new Date()` isn't deterministic, so it can't
  // run while this page is statically prerendered.
  const [months, setMonths] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    // Syncs with the wall clock, an external system that can't be read during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMonths(upcomingMonths());
  }, []);
  const [scope, setScope] = useState<TourScope>("DOMESTIC");
  const [destination, setDestination] = useState("");
  const [month, setMonth] = useState("");
  const [adults, setAdults] = useState(2);
  const [category, setCategory] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (month) params.set("month", month);
    params.set("adults", String(adults));

    // A specific destination already has its own curated page; go straight
    // there rather than through the generic (and less complete) listing.
    if (destination) {
      router.push(`${destination}?${params.toString()}`);
      return;
    }

    if (category) params.set("category", category);
    if (maxPrice) params.set("maxPrice", maxPrice);
    router.push(`${routes.scope(scope)}?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-[1250px] rounded-3xl bg-white shadow-raised">
      <div className="flex items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-line px-4 pt-1 sm:px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {scopeTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setScope(tab.key);
              setDestination("");
            }}
            aria-pressed={scope === tab.key}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 px-3 py-4 text-body-sm font-medium transition-colors",
              scope === tab.key ? "text-brand-pink" : "text-muted hover:text-ink",
            )}
          >
            <Icon name={tab.icon} className="size-4" />
            {tab.label}
            {scope === tab.key && (
              <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-pink" />
            )}
          </button>
        ))}
        <Link
          href={routes.visa()}
          className="flex shrink-0 items-center gap-1.5 px-3 py-4 text-body-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <Icon name="passport" className="size-4" />
          Visa Services
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
          <FinderSelect
            label="Destination"
            icon="map"
            value={destination}
            onChange={setDestination}
            placeholder="Where to?"
            options={destinationsByScope[scope].map((d) => ({ value: d.href, label: d.name }))}
          />
          <FinderSelect
            label="Travel month"
            icon="calendar"
            value={month}
            onChange={setMonth}
            placeholder="Month"
            options={months}
          />
          <AdultsField value={adults} onChange={setAdults} />
          <FinderSelect
            label="Package type"
            icon="filter"
            value={category}
            onChange={setCategory}
            placeholder="Any type"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <FinderSelect
            label="Budget"
            icon="receipt"
            value={maxPrice}
            onChange={setMaxPrice}
            placeholder="Any budget"
            options={budgetOptions}
          />
          <button
            type="submit"
            className={homeButtonClassName({ className: "w-full sm:col-span-2 lg:col-span-1 px-4 xl:px-6 whitespace-nowrap" })}
          >
            <SearchIcon />
            Find Packages
          </button>
        </div>

        <p className="mt-5 text-body-sm text-muted">
          Not sure where to go?{" "}
          <Link href={routes.planTrip()} className="font-medium text-brand-pink hover:underline">
            Let our experts guide you →
          </Link>
        </p>
      </form>

      {trending.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4 sm:px-6">
          <span className="eyebrow mr-1 shrink-0 text-muted">Trending</span>
          {trending.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-full border border-line-strong px-3 py-1 text-caption text-ink/80 transition-colors hover:border-ink hover:text-ink"
            >
              {t.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-4 shrink-0">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
