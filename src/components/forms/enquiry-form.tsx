"use client";

import { useActionState, useRef, useState } from "react";
import { submitEnquiry, type EnquiryState } from "@/app/(site)/plan-your-trip/actions";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { attributionPayload } from "./attribution";

export type EnquiryDefaults = {
  enquiryType?: "package" | "custom_trip" | "visa" | "callback" | "general";
  packageSlug?: string;
  packageName?: string;
  destination?: string;
  message?: string;
};

const BUDGETS = [
  ["under-50k", "Under ₹50,000"],
  ["50k-1l", "₹50,000 – ₹1 lakh"],
  ["1l-2l", "₹1 – 2 lakh"],
  ["2l-5l", "₹2 – 5 lakh"],
  ["above-5l", "Above ₹5 lakh"],
] as const;

/**
 * Trip enquiry form. Works without JavaScript (plain form post to the server
 * action); with JavaScript it adds attribution and inline errors.
 */
export function EnquiryForm({
  defaults = {},
  destinations = [],
  formPath,
  compact = false,
}: {
  defaults?: EnquiryDefaults;
  destinations?: string[];
  formPath: string;
  /** Short version (name, phone, destination, message) for sidebars and contact page. */
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState<EnquiryState, FormData>(submitEnquiry, {});
  const [sameWhatsapp, setSameWhatsapp] = useState(true);
  const attributionRef = useRef<HTMLInputElement>(null);
  const err = (field: string) => state.fieldErrors?.[field]?.[0];

  return (
    <form
      action={action}
      onSubmit={() => {
        if (attributionRef.current) attributionRef.current.value = attributionPayload();
      }}
      noValidate
      className="space-y-10"
    >
      <input type="hidden" name="enquiryType" value={defaults.enquiryType ?? (defaults.packageSlug ? "package" : "custom_trip")} />
      {defaults.packageSlug && <input type="hidden" name="packageSlug" value={defaults.packageSlug} />}
      <input type="hidden" name="formPath" value={formPath} />
      <input type="hidden" name="attribution" ref={attributionRef} defaultValue="" />
      {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Company website
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {defaults.packageName && (
        <p className="rounded-2xl border border-line bg-sand px-5 py-4 text-body-sm">
          Enquiring about <strong className="font-semibold text-ink">{defaults.packageName}</strong>
        </p>
      )}

      <fieldset className="space-y-6">
        <legend className="eyebrow mb-6 text-accent-strong">Your trip</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField label="Where would you like to go?" error={err("destination")} className="sm:col-span-2">
            {(p) => (
              <>
                <input
                  {...p}
                  name="destination"
                  list="enquiry-destinations"
                  defaultValue={defaults.destination}
                  placeholder="e.g. Vietnam, Kerala, not sure yet"
                  autoComplete="off"
                  maxLength={200}
                />
                <datalist id="enquiry-destinations">
                  {destinations.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </>
            )}
          </FormField>
          {!compact && (
            <>
              <FormField label="Travel date" error={err("travelDate")}>
                {(p) => <input {...p} type="date" name="travelDate" />}
              </FormField>
              <FormField label="How flexible are the dates?" error={err("dateFlexibility")}>
                {(p) => (
                  <select {...p} name="dateFlexibility" defaultValue="">
                    <option value="">Choose…</option>
                    <option value="exact">Fixed dates</option>
                    <option value="flexible_week">Give or take a week</option>
                    <option value="flexible_month">Any time that month</option>
                    <option value="undecided">Not decided yet</option>
                  </select>
                )}
              </FormField>
              <FormField label="Adults" error={err("adults")}>
                {(p) => <input {...p} type="number" name="adults" min={1} max={99} defaultValue={2} inputMode="numeric" />}
              </FormField>
              <FormField label="Children (under 12)" error={err("children")}>
                {(p) => <input {...p} type="number" name="children" min={0} max={99} defaultValue={0} inputMode="numeric" />}
              </FormField>
              <FormField label="Budget per person" error={err("budget")}>
                {(p) => (
                  <select {...p} name="budget" defaultValue="">
                    <option value="">Prefer not to say</option>
                    {BUDGETS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
              <FormField label="Travelling from" error={err("departureCity")}>
                {(p) => <input {...p} name="departureCity" placeholder="e.g. Mumbai" autoComplete="address-level2" maxLength={100} />}
              </FormField>
            </>
          )}
          <FormField label="Anything else we should know?" error={err("message")} className="sm:col-span-2">
            {(p) => (
              <textarea
                {...p}
                name="message"
                rows={compact ? 3 : 4}
                defaultValue={defaults.message}
                placeholder="Occasion, hotel style, pace, special requests…"
                className={cn(p.className, "min-h-28 py-3")}
                maxLength={5000}
              />
            )}
          </FormField>
        </div>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="eyebrow mb-6 text-accent-strong">Your details</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField label="Full name" required error={err("name")} className="sm:col-span-2">
            {(p) => <input {...p} name="name" required autoComplete="name" maxLength={120} />}
          </FormField>
          <FormField label="Mobile number" required hint="We'll call or WhatsApp you on this number." error={err("phone")}>
            {(p) => <input {...p} type="tel" name="phone" required autoComplete="tel" inputMode="tel" placeholder="98765 43210" maxLength={24} />}
          </FormField>
          <FormField label="Email" error={err("email")}>
            {(p) => <input {...p} type="email" name="email" autoComplete="email" maxLength={254} />}
          </FormField>
          <label className="flex items-center gap-3 text-body-sm sm:col-span-2">
            <input
              type="checkbox"
              name="whatsappSameAsPhone"
              checked={sameWhatsapp}
              onChange={(e) => setSameWhatsapp(e.target.checked)}
              className="size-5 accent-ink"
            />
            My WhatsApp number is the same
          </label>
          {/* Unchecked boxes send nothing; make "false" explicit. */}
          {!sameWhatsapp && <input type="hidden" name="whatsappSameAsPhone" value="false" />}
          {!sameWhatsapp && (
            <FormField label="WhatsApp number" error={err("whatsapp")} className="sm:col-span-2">
              {(p) => <input {...p} type="tel" name="whatsapp" autoComplete="tel" inputMode="tel" maxLength={24} />}
            </FormField>
          )}
        </div>
        <div className="space-y-3 text-body-sm text-muted">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="whatsappOptIn" className="mt-0.5 size-5 accent-ink" />
            Send me trip updates and offers on WhatsApp
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="marketingConsent" className="mt-0.5 size-5 accent-ink" />
            Email me travel ideas and seasonal offers (unsubscribe anytime)
          </label>
        </div>
      </fieldset>

      {(state.formError || state.fieldErrors) && (
        <p role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 px-5 py-4 text-body-sm text-danger">
          {state.formError ?? "Please check the highlighted fields."}
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Sending…" : "Send my enquiry"}
        </Button>
        <p className="text-caption text-muted">
          We use your details only to plan your trip.
        </p>
      </div>
    </form>
  );
}
