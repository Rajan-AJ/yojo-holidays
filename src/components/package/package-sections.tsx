import type {
  DepartureView,
  ItineraryDayDetail,
  ListItem,
  PackageHotelView,
  PolicyView,
  PricePlanView,
  RichTextDoc,
} from "@/types/content";
import { departureStatusLabel, priceBasisLabel } from "@/lib/labels";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Prose } from "@/components/content/prose";
import { padNumber } from "@/lib/format";

/**
 * Package page sections. Each takes database records and renders nothing
 * when there is nothing to show; no section ever invents content.
 */

export function HighlightsSection({ items }: { items: (ListItem & { icon?: string })[] }) {
  if (items.length === 0) return null;
  return (
    <Section aria-labelledby="highlights-title" spacing="compact">
      <Container>
        <SectionHeading id="highlights-title" eyebrow="Highlights" title="What makes this trip." />
        <ol className="mt-block grid gap-x-10 border-t border-line sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <li key={item.title} className="flex gap-5 border-b border-line py-7">
              <span aria-hidden="true" className="caption pt-1.5 tabular-nums text-muted">
                {padNumber(i + 1)}
              </span>
              <div>
                <h3 className="text-h4">{item.title}</h3>
                {item.description && <p className="mt-2 text-body-sm text-muted">{item.description}</p>}
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

/** Activities / meals / stay for one itinerary day (passed into ItineraryStory). */
export function DayDetails({ day }: { day: ItineraryDayDetail }) {
  const kindLabel = { activity: "Activity", sightseeing: "Sightseeing", transfer: "Transfer", place: "Visit" } as const;
  const activities = day.activities.map(
    (a) => [kindLabel[a.kind], a.optional ? `${a.title} (optional)` : a.title] as [string, string],
  );
  const meals = mealNames(day.meals);

  if (activities.length === 0 && meals.length === 0 && !day.accommodation) return null;

  return (
    <dl className="mt-6 max-w-md space-y-3 border-t border-line pt-5 text-body-sm">
      {activities.map(([label, text], i) => (
        <div key={`${label}-${i}`} className="grid grid-cols-[6.5rem_1fr] gap-3">
          <dt className="text-muted">{label}</dt>
          <dd>{text}</dd>
        </div>
      ))}
      <div className="grid grid-cols-[6.5rem_1fr] gap-3">
        <dt className="text-muted">Meals</dt>
        <dd>{meals.length > 0 ? meals.join(", ") : "Not included"}</dd>
      </div>
      {day.accommodation && (
        <div className="grid grid-cols-[6.5rem_1fr] gap-3">
          <dt className="text-muted">Stay</dt>
          <dd>{day.accommodation}</dd>
        </div>
      )}
    </dl>
  );
}

function mealNames(meals: ItineraryDayDetail["meals"]) {
  return [meals.breakfast && "Breakfast", meals.lunch && "Lunch", meals.dinner && "Dinner"].filter(
    (m): m is string => Boolean(m),
  );
}

/** Totals derived from the itinerary, e.g. { breakfast: 6, lunch: 1, dinner: 2 }. */
export function countMeals(days: ItineraryDayDetail[]) {
  return days.reduce(
    (acc, d) => ({
      breakfast: acc.breakfast + Number(d.meals.breakfast),
      lunch: acc.lunch + Number(d.meals.lunch),
      dinner: acc.dinner + Number(d.meals.dinner),
    }),
    { breakfast: 0, lunch: 0, dinner: 0 },
  );
}

export function StaysAndMealsSection({
  hotels,
  meals,
}: {
  hotels: PackageHotelView[];
  meals: ReturnType<typeof countMeals>;
}) {
  const mealLines = (
    [
      ["breakfast", "Breakfasts"],
      ["lunch", "Lunches"],
      ["dinner", "Dinners"],
    ] as const
  ).filter(([key]) => meals[key] > 0);

  if (hotels.length === 0 && mealLines.length === 0) return null;

  return (
    <Section tone="surface" aria-labelledby="stays-title" spacing="compact">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {hotels.length > 0 && (
            <div className="lg:col-span-8">
              <SectionHeading id="stays-title" eyebrow="Hotels" title="Where you'll stay." />
              <ul className="mt-10 border-t border-line">
                {hotels.map((hotel, i) => (
                  <li key={`${hotel.name}-${i}`} className="grid gap-2 border-b border-line py-6 sm:grid-cols-[1fr_auto] sm:gap-8">
                    <div>
                      <h3 className="text-h4">
                        {hotel.name}
                        {hotel.isOption && <span className="text-body-sm text-muted"> (or similar)</span>}
                      </h3>
                      <p className="mt-1 text-body-sm text-muted">
                        {[hotel.city, hotel.starRating && `${hotel.starRating}-star`, hotel.roomType, hotel.mealPlan]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <p className="font-serif text-h4 sm:text-right">
                      {hotel.nights} {hotel.nights === 1 ? "night" : "nights"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mealLines.length > 0 && (
            <div className={hotels.length > 0 ? "lg:col-span-4" : "lg:col-span-12"}>
              {/* Heading level stays h2: it is its own topic, not part of hotels. */}
              <h2 id={hotels.length > 0 ? undefined : "stays-title"} className="text-h3">
                Meals included
              </h2>
              <dl className="mt-8 space-y-4">
                {mealLines.map(([key, label]) => (
                  <div key={key} className="flex items-baseline justify-between border-b border-line pb-4">
                    <dt className="text-body text-muted">{label}</dt>
                    <dd className="font-serif text-h3">{meals[key]}</dd>
                  </div>
                ))}
              </dl>
              <p className="caption mt-4 text-muted">Day-by-day meals are listed in the itinerary.</p>
            </div>
          )}
        </div>
      </Container>
    </Section>
  );
}

export function InclusionsSection({ included, excluded }: { included: ListItem[]; excluded: ListItem[] }) {
  if (included.length === 0 && excluded.length === 0) return null;

  const column = (id: string, title: string, items: ListItem[], mark: string) =>
    items.length > 0 && (
      <div>
        <h2 id={id} className="text-h3">
          {title}
        </h2>
        <ul className="mt-6 border-t border-line">
          {items.map((item) => (
            <li key={item.title} className="flex gap-4 border-b border-line py-4">
              <span aria-hidden="true" className="w-4 shrink-0 font-medium text-accent-strong">
                {mark}
              </span>
              <div>
                <p className="text-body">{item.title}</p>
                {item.description && <p className="mt-1 text-body-sm text-muted">{item.description}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <Section aria-label="What's included" spacing="compact">
      <Container>
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          {column("included-title", "What's included", included, "+")}
          {column("excluded-title", "Not included", excluded, "−")}
        </div>
      </Container>
    </Section>
  );
}

export function ImportantInfoSection({ text }: { text?: string | RichTextDoc }) {
  if (!text) return null;
  return (
    <Section aria-labelledby="important-title" spacing="compact">
      <Container size="standard">
        <div className="grid gap-8 lg:grid-cols-12">
          <h2 id="important-title" className="text-h3 lg:col-span-4">
            Important information
          </h2>
          <Prose text={text} className="text-body lg:col-span-8" />
        </div>
      </Container>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Pricing, departures, policies
// ---------------------------------------------------------------------------

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const fmtDate = (iso?: string) => (iso ? dateFmt.format(new Date(`${iso}T00:00:00+05:30`)) : undefined);

/** Price plans (hotel tiers) per season. Only rows that exist are shown; nothing is estimated. */
export function PricingSection({ plans }: { plans: PricePlanView[] }) {
  if (plans.length === 0) return null;
  const columns = [
    ["adultTwin", "Adult (twin)"],
    ["adultTriple", "Adult (triple)"],
    ["childWithBed", "Child with bed"],
    ["childWithoutBed", "Child no bed"],
    ["infant", "Infant"],
    ["singleSupplement", "Single supplement"],
  ] as const;
  const shown = columns.filter(([key]) => plans.some((p) => p[key] !== null));
  return (
    <Section id="pricing" aria-labelledby="pricing-title" spacing="compact">
      <Container>
        <SectionHeading id="pricing-title" eyebrow="Pricing" title="Prices and seasons" />
        <div className="mt-block overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[40rem] text-left text-body-sm">
            <caption className="sr-only">Package prices by plan and season</caption>
            <thead className="bg-sand text-caption uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-5 py-4 font-semibold">Plan</th>
                <th scope="col" className="px-5 py-4 font-semibold">Valid</th>
                {shown.map(([key, label]) => (
                  <th key={key} scope="col" className="px-5 py-4 text-right font-semibold">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {plans.map((plan, i) => (
                <tr key={`${plan.name}-${i}`}>
                  <th scope="row" className="px-5 py-4 font-semibold text-ink">
                    {plan.name}
                    <span className="block text-caption font-normal text-muted">
                      {priceBasisLabel[plan.basis]}
                      {plan.includesGst ? ", incl. GST" : ", plus GST"}
                    </span>
                  </th>
                  <td className="px-5 py-4 text-muted">
                    {plan.validFrom || plan.validTo
                      ? `${fmtDate(plan.validFrom) ?? "Now"} to ${fmtDate(plan.validTo) ?? "further notice"}`
                      : "All year"}
                  </td>
                  {shown.map(([key]) => (
                    <td key={key} className="px-5 py-4 text-right tabular-nums">
                      {plan[key] !== null ? formatPrice(plan[key]!, plan.currency) : "–"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {plans.some((p) => p.notes) && (
          <ul className="mt-5 space-y-1 text-body-sm text-muted">
            {plans.filter((p) => p.notes).map((p, i) => (
              <li key={i}>
                <span className="font-medium text-ink">{p.name}:</span> {p.notes}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-caption text-muted">
          Prices are per person unless stated and may change with availability and exchange rates until your booking is confirmed.
        </p>
      </Container>
    </Section>
  );
}

export function DeparturesSection({ departures, enquireHref }: { departures: DepartureView[]; enquireHref: string }) {
  if (departures.length === 0) return null;
  return (
    <Section id="departures" tone="surface" aria-labelledby="departures-title" spacing="compact">
      <Container>
        <SectionHeading id="departures-title" eyebrow="Group departures" title="Upcoming dates" />
        <ul className="mt-block divide-y divide-line border-y border-line">
          {departures.map((d) => {
            const closed = d.status === "sold_out" || d.status === "closed";
            return (
              <li key={d.date} className="flex flex-wrap items-center justify-between gap-4 py-5">
                <div>
                  <p className="text-h4">
                    {fmtDate(d.date)}
                    {d.returnDate && <span className="text-muted"> to {fmtDate(d.returnDate)}</span>}
                  </p>
                  {d.seatsAvailable !== undefined && !closed && (
                    <p className="text-body-sm text-muted">{d.seatsAvailable} seats left</p>
                  )}
                </div>
                <div className="flex items-center gap-5">
                  {d.price !== null && <p className="tabular-nums">From {formatPrice(d.price, d.currency)}</p>}
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-caption font-semibold",
                      d.status === "filling_fast" && "bg-accent/15 text-accent-strong",
                      d.status === "open" && "bg-success/10 text-success",
                      closed && "bg-line text-muted",
                    )}
                  >
                    {departureStatusLabel[d.status]}
                  </span>
                  {!closed && (
                    <a href={enquireHref} className="text-body-sm font-semibold underline underline-offset-4">
                      Enquire
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}

export function PoliciesSection({ policies }: { policies: PolicyView[] }) {
  if (policies.length === 0) return null;
  const label = { terms: "Booking terms", cancellation: "Cancellation policy", payment: "Payment terms" } as const;
  return (
    <Section aria-labelledby="policies-title" spacing="compact">
      <Container>
        <SectionHeading id="policies-title" eyebrow="The small print" title="Terms and cancellation" />
        <div className="mt-block divide-y divide-line border-y border-line">
          {policies.map((p) => (
            <details key={p.kind} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-h4 [&::-webkit-details-marker]:hidden">
                {label[p.kind]}
                <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <Prose text={p.body} className="mt-4 text-body" />
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}
