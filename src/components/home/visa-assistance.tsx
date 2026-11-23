import type { PassportRef, VisaDestinationOption } from "@/types/content";
import { routes } from "@/lib/routes";
import { GradientIcon } from "./icons";
import { Arrow, HomeButton, HomeHeading, HomeSection } from "./ui";

const fieldClass =
  "h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-[14px] text-brand-navy outline-none transition-colors focus:border-brand-pink";

/**
 * Visa entry point. A plain GET form to the Visa Finder (works without
 * JavaScript): passport + destination from the database; the finder then asks
 * the purpose and shows the result. No requirements are stated here.
 */
export function VisaAssistance({
  passports,
  destinations,
}: {
  passports: PassportRef[];
  destinations: VisaDestinationOption[];
}) {
  return (
    <HomeSection tone="navy" aria-labelledby="visa-title" className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-0 size-80 rounded-full bg-brand-pink/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 bottom-0 size-72 rounded-full bg-brand-teal/15 blur-3xl" />

      <div className="relative grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <HomeHeading
            id="visa-title"
            eyebrow="Visa assistance"
            title="Your journey starts"
            accent="before you fly"
            description="Not sure what you need? Choose your passport and destination, and the Visa Finder takes it from there."
            light
            className="mb-8 sm:mb-8"
          />
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: "passport" as const, title: "Document checklists", body: "Know what to prepare." },
              { icon: "chat" as const, title: "Guidance from our team", body: "Help with your application." },
            ].map((item, index) => (
              <li key={item.title} className="flex items-start gap-3">
                <GradientIcon name={item.icon} index={index} size="sm" />
                <span>
                  <span className="block font-display text-[15px] font-bold text-white">{item.title}</span>
                  <span className="block text-[13px] text-white/60">{item.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <form
          action={routes.visaFinder()}
          method="get"
          aria-labelledby="visa-form-title"
          className="on-light rounded-2xl bg-white p-6 text-brand-navy shadow-(--shadow-card-hover) sm:p-8"
        >
          <h3 id="visa-form-title" className="font-display text-[22px] font-bold">
            Check what you need
          </h3>
          <p className="mt-1 text-[13.5px] text-gray-500">Start with your passport and where you&apos;re going.</p>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-[12.5px] font-semibold text-gray-600">Passport</span>
              <select name="passport" defaultValue={passports[0]?.isoCode} className={fieldClass}>
                {passports.map((p) => (
                  <option key={p.isoCode} value={p.isoCode}>
                    {p.demonym ? `${p.demonym} passport` : p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-[12.5px] font-semibold text-gray-600">Destination country</span>
              <select name="destination" required defaultValue="" className={fieldClass}>
                <option value="" disabled>
                  Select country
                </option>
                {destinations.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-pink px-7 text-[14px] font-semibold text-white shadow-(--shadow-btn-pink) transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-pink-dark"
            >
              Get visa help
              <Arrow />
            </button>
            <HomeButton href={routes.visa()} variant="outline" className="border-0 px-0 hover:text-brand-pink">
              All visa guides
              <Arrow />
            </HomeButton>
          </div>
        </form>
      </div>
    </HomeSection>
  );
}
