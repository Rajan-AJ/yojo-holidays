import "server-only";
import { transaction } from "@/lib/db";
import { budgetBands, leadInput, type TouchInput } from "@/server/validation/leads";
import { classifyChannel, deviceType } from "./attribution";

/**
 * Where enquiries enter the database.
 *
 * Input is `unknown` on purpose: the server action passes the raw form and
 * this module validates it. Nothing from the browser is trusted: packages are
 * looked up by public slug and must be published; the marketing channel is
 * classified here, not in the browser.
 *
 * One person = one `contacts` row (deduplicated by phone). Each enquiry is a
 * `leads` row with first/last-touch attribution in `lead_touchpoints`.
 */

export type LeadResult =
  | { ok: true; reference: string }
  | { ok: false; fieldErrors: Record<string, string[] | undefined> };

export const leadReference = (n: number) => `YJ-${String(n).padStart(6, "0")}`;

/** Same person + same package within this window = a double submit, not a new lead. */
const DUPLICATE_WINDOW_MINUTES = 10;

export async function createLead(
  raw: unknown,
  context: { userAgent?: string | null; siteHost?: string } = {},
): Promise<LeadResult> {
  const parsed = leadInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;

  // Honeypot filled in: pretend success, store nothing.
  if (v.company_website) return { ok: true, reference: leadReference(0) };

  const whatsapp = v.whatsappSameAsPhone ? v.phone : (v.whatsapp ?? null);
  const band = v.budget ? budgetBands[v.budget] : undefined;
  const device = deviceType(context.userAgent);

  return transaction(async (db) => {
    const contact = (
      await db.query<{ id: string }>(
        `insert into public.contacts (full_name, phone, whatsapp, email, city, marketing_consent, whatsapp_opt_in, consent_at, consent_text_version)
         values ($1, $2, $3, $4, $5, $6, $7, case when $6 or $7 then now() end, case when $6 or $7 then 'v1' end)
         on conflict (phone) where phone is not null do update set
           full_name         = excluded.full_name,
           whatsapp          = coalesce(excluded.whatsapp, contacts.whatsapp),
           email             = coalesce(excluded.email, contacts.email),
           city              = coalesce(excluded.city, contacts.city),
           marketing_consent = contacts.marketing_consent or excluded.marketing_consent,
           whatsapp_opt_in   = contacts.whatsapp_opt_in or excluded.whatsapp_opt_in,
           consent_at        = coalesce(excluded.consent_at, contacts.consent_at),
           consent_text_version = coalesce(excluded.consent_text_version, contacts.consent_text_version)
         returning id`,
        [v.name, v.phone, whatsapp, v.email ?? null, v.city ?? null, v.marketingConsent, v.whatsappOptIn],
      )
    ).rows[0];

    // Published package (by slug) and its destination; otherwise try to match the typed destination.
    const pkg = v.packageSlug
      ? (
          await db.query<{ id: string; destination_id: string }>(
            `select p.id, p.primary_destination_id as destination_id from public.packages p
              where p.slug = $1 and p.status = 'published' and p.deleted_at is null`,
            [v.packageSlug],
          )
        ).rows[0]
      : undefined;
    const destinationId =
      pkg?.destination_id ??
      (v.destination
        ? (
            await db.query<{ id: string }>(
              `select id from public.destinations
                where lower(name) = lower($1) and status = 'published' and deleted_at is null limit 1`,
              [v.destination],
            )
          ).rows[0]?.id
        : undefined);

    const duplicate = (
      await db.query<{ lead_number: number }>(
        `select lead_number from public.leads
          where contact_id = $1 and package_id is not distinct from $2
            and created_at > now() - make_interval(mins => $3)
          order by created_at desc limit 1`,
        [contact.id, pkg?.id ?? null, DUPLICATE_WINDOW_MINUTES],
      )
    ).rows[0];
    if (duplicate) return { ok: true as const, reference: leadReference(duplicate.lead_number) };

    const lead = (
      await db.query<{ id: string; lead_number: number }>(
        `insert into public.leads (contact_id, enquiry_type, destination_id, destination_text, package_id,
            departure_city, travel_date, date_flexibility, duration_nights, adults, children, infants,
            budget_min, budget_max, budget_currency, message, form_path)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         returning id, lead_number`,
        [
          contact.id,
          pkg ? "package" : v.enquiryType,
          destinationId ?? null,
          v.destination ?? null,
          pkg?.id ?? null,
          v.departureCity ?? null,
          v.travelDate ?? null,
          v.dateFlexibility ?? null,
          v.durationNights ?? null,
          v.adults ?? null,
          v.children ?? null,
          v.infants ?? null,
          band?.min ?? null,
          band?.max ?? null,
          band ? "INR" : null,
          v.message ?? null,
          v.formPath,
        ],
      )
    ).rows[0];

    // First and last touch (the browser keeps both; with one visit they are the same).
    const touches: [("first" | "last"), TouchInput | undefined][] = [
      ["first", v.attribution?.first ?? v.attribution?.last],
      ["last", v.attribution?.last ?? v.attribution?.first],
    ];
    for (const [touch, t] of touches) {
      const channel = classifyChannel(t, context.siteHost);
      await db.query(
        `insert into public.lead_touchpoints (lead_id, touch, channel_id, utm_source, utm_medium, utm_campaign,
            utm_term, utm_content, gclid, gbraid, wbraid, fbclid, fbc, fbp, landing_path, referrer, device_type, occurred_at)
         values ($1, $2, (select id from public.marketing_channels where code = $3), $4, $5, $6, $7, $8, $9, $10, $11,
                 $12, $13, $14, $15, $16, $17, coalesce($18::timestamptz, now()))`,
        [
          lead.id,
          touch,
          channel,
          t?.utm_source ?? null,
          t?.utm_medium ?? null,
          t?.utm_campaign ?? null,
          t?.utm_term ?? null,
          t?.utm_content ?? null,
          t?.gclid ?? null,
          t?.gbraid ?? null,
          t?.wbraid ?? null,
          t?.fbclid ?? null,
          t?.fbc ?? null,
          t?.fbp ?? null,
          t?.landing_path ?? null,
          t?.referrer ?? null,
          device,
          t?.at ?? null,
        ],
      );
    }

    return { ok: true as const, reference: leadReference(lead.lead_number) };
  });
}
