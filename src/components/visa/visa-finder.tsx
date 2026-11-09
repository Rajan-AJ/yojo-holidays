"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { m } from "motion/react";
import type { PassportRef, VisaPurpose } from "@/types/content";
import { Button } from "@/components/ui/button";
import { visaPurposeLabel } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";

/** What the finder needs per guide: the server sends only this, not visa details. */
export type FinderGuide = {
  passportIso: string;
  countrySlug: string;
  countryName: string;
  purposes: VisaPurpose[];
};

export type FinderAnswers = { passport?: string; destination?: string; purpose?: VisaPurpose };

const STEPS = ["passport", "destination", "purpose"] as const;
type Step = (typeof STEPS)[number];

/**
 * Visa Finder: Passport -> Destination -> Purpose -> Result.
 *
 * Options come from the database via props (only combinations that have a
 * published guide). "Show my visa" navigates to /visa/finder/?passport=..
 * &destination=..&purpose=.. and the SERVER renders the result from the
 * database (and re-validates every value). Nothing personal is collected,
 * so the answers are safe in the URL and the result can be shared.
 */
export function VisaFinder({
  passports,
  guides,
  initial = {},
  headingLevel: Heading = "h2",
}: {
  passports: PassportRef[];
  guides: FinderGuide[];
  initial?: FinderAnswers;
  headingLevel?: "h2" | "h3";
}) {
  const router = useRouter();
  const baseId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);

  // Pre-select the only passport when there is just one.
  const [answers, setAnswers] = useState<FinderAnswers>(() => ({
    passport: initial.passport ?? (passports.length === 1 ? passports[0].isoCode : undefined),
    destination: initial.destination,
    purpose: initial.purpose,
  }));
  const [step, setStep] = useState<Step>(() =>
    !initial.passport && passports.length > 1 ? "passport" : !initial.destination ? "destination" : "purpose",
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const destinations = useMemo(
    () => guides.filter((g) => g.passportIso === answers.passport),
    [guides, answers.passport],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? destinations.filter((d) => d.countryName.toLowerCase().includes(q)) : destinations;
  }, [destinations, query]);
  const guide = destinations.find((d) => d.countrySlug === answers.destination);
  const purposes = guide?.purposes ?? [];

  // Move focus to the new question so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const choose = (patch: FinderAnswers) => {
    setError(null);
    setAnswers((a) => {
      const next = { ...a, ...patch };
      // Changing an earlier answer clears later ones that may no longer apply.
      if (patch.passport && patch.passport !== a.passport) return { passport: patch.passport };
      if (patch.destination && patch.destination !== a.destination) return { ...next, purpose: undefined };
      return next;
    });
  };

  const missing: Record<Step, string> = {
    passport: "Choose your passport to continue.",
    destination: "Choose a destination to continue.",
    purpose: "Choose the purpose of your trip.",
  };

  const next = () => {
    const value = step === "passport" ? answers.passport : step === "destination" ? answers.destination : answers.purpose;
    if (!value) return setError(missing[step]);
    if (step !== "purpose") return setStep(STEPS[stepIndex + 1]);
    setSubmitting(true);
    router.push(routes.visaFinder(answers) + "#result");
  };

  const back = () => {
    setError(null);
    setStep(STEPS[Math.max(0, stepIndex - 1)]);
  };

  const questions: Record<Step, string> = {
    passport: "What passport do you hold?",
    destination: "Where are you travelling?",
    purpose: "What is the purpose of your trip?",
  };
  const errorId = `${baseId}-error`;

  return (
    <form
      className="on-light"
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      noValidate
    >
      {/* Progress: text for everyone, bars are decorative. */}
      <div className="flex items-center gap-4">
        <p className="caption text-muted" aria-live="polite">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
        <ol aria-hidden="true" className="flex flex-1 gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className={cn("h-0.5 flex-1 transition-colors", i <= stepIndex ? "bg-ink" : "bg-line-strong")} />
          ))}
        </ol>
      </div>

      <m.fieldset
        key={step}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mt-8"
        aria-describedby={error ? errorId : undefined}
      >
        <legend className="contents">
          <Heading ref={headingRef} tabIndex={-1} className="text-h2 outline-none">
            {questions[step]}
          </Heading>
        </legend>

        {step === "passport" && (
          <OptionList
            name="passport"
            value={answers.passport}
            onChange={(v) => choose({ passport: v })}
            options={passports.map((p) => ({ value: p.isoCode, label: p.demonym ? `${p.demonym} passport` : p.name }))}
          />
        )}

        {step === "destination" && (
          <>
            <div className="mt-8 max-w-md">
              <label htmlFor={`${baseId}-search`} className="text-body-sm font-medium">
                Search destinations
              </label>
              <input
                id={`${baseId}-search`}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a country, e.g. Viet"
                autoComplete="off"
                className="mt-2 min-h-12 w-full rounded-field border border-line-strong bg-surface px-4 text-body focus-visible:border-ink focus-visible:outline-offset-0"
              />
            </div>
            <p className="caption mt-3 text-muted" aria-live="polite">
              {filtered.length} {filtered.length === 1 ? "destination" : "destinations"}
            </p>
            {filtered.length > 0 ? (
              <OptionList
                name="destination"
                value={answers.destination}
                onChange={(v) => choose({ destination: v })}
                options={filtered.map((d) => ({ value: d.countrySlug, label: d.countryName }))}
                columns
              />
            ) : (
              <p className="mt-6 text-body text-muted">
                We don&apos;t have a guide for “{query}” yet.{" "}
                <Link href={routes.planTrip({ visa: query })} className="text-ink underline underline-offset-4">
                  Ask our visa team
                </Link>
                .
              </p>
            )}
          </>
        )}

        {step === "purpose" && guide && (
          <>
            <p className="mt-3 text-body text-muted">Travelling to {guide.countryName}</p>
            <OptionList
              name="purpose"
              value={answers.purpose}
              onChange={(v) => choose({ purpose: v as VisaPurpose })}
              options={purposes.map((p) => ({ value: p, label: visaPurposeLabel[p] }))}
            />
          </>
        )}
      </m.fieldset>

      {error && (
        <p id={errorId} role="alert" className="mt-6 text-body-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" loading={submitting}>
          {step === "purpose" ? "Show my visa" : "Continue"}
        </Button>
        {stepIndex > 0 && !(stepIndex === 1 && passports.length === 1) && (
          <Button type="button" variant="ghost" onClick={back}>
            Back
          </Button>
        )}
      </div>
    </form>
  );
}

/** Large, tappable radio options. Native radios keep keyboard behaviour (arrow keys). */
function OptionList({
  name,
  value,
  onChange,
  options,
  columns = false,
}: {
  name: string;
  value?: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  columns?: boolean;
}) {
  return (
    <div className={cn("mt-8 grid gap-3", columns && "sm:grid-cols-2 lg:grid-cols-3")}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex min-h-16 cursor-pointer items-center gap-4 border px-5 transition-colors duration-(--duration-fast)",
            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-strong",
            value === option.value ? "border-ink bg-surface" : "border-line-strong hover:border-ink/60",
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="size-5 shrink-0 accent-ink focus-visible:outline-none"
          />
          <span className="font-serif text-h4">{option.label}</span>
        </label>
      ))}
    </div>
  );
}
