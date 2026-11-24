import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/admin/session";
import { getLead, leadFormOptions, leadRef } from "@/server/admin/leads";
import { AdminPage, Badge, Card, PageHeader, formatAdminDate } from "@/components/admin/ui";
import { LeadWorkPanel } from "@/components/admin/lead-work-panel";
import { formatPrice } from "@/lib/format";

const UUID = /^[0-9a-f-]{36}$/i;
const flexLabel: Record<string, string> = { exact: "Fixed dates", flexible_week: "± a week", flexible_month: "Any time that month", undecided: "Not decided" };

export default async function LeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const session = await requireStaff();
  const [lead, opts] = await Promise.all([getLead(session, id), leadFormOptions()]);
  if (!lead) notFound();

  const c = lead.contact;
  const stage = opts.stages.find((s) => s.id === lead.stage_id);
  const canUpdate =
    session.can("leads", "update_all") || (session.can("leads", "update_assigned") && (!lead.assigned_to || lead.assigned_to === session.id));
  const waNumber = (c.whatsapp ?? c.phone)?.replace(/\D/g, "");
  const budget =
    lead.budget_min != null || lead.budget_max != null
      ? `${lead.budget_min != null ? formatPrice(lead.budget_min, "INR") : "—"} to ${lead.budget_max != null ? formatPrice(lead.budget_max, "INR") : "no limit"}`
      : null;
  const travellers = [
    lead.adults != null && `${lead.adults} adult${lead.adults === 1 ? "" : "s"}`,
    lead.children ? `${lead.children} child${lead.children === 1 ? "" : "ren"}` : null,
    lead.infants ? `${lead.infants} infant${lead.infants === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  const trip: [string, React.ReactNode][] = [
    ["Enquiry type", lead.enquiry_type.replace("_", " ")],
    ["Package", lead.package_name && lead.package_slug ? <a href={`/packages/${lead.package_slug}/`} target="_blank" rel="noreferrer" className="underline">{lead.package_name} ↗</a> : null],
    ["Destination", lead.destination ?? lead.destination_text],
    ["Travel date", lead.travel_date ? `${formatAdminDate(lead.travel_date)}${lead.date_flexibility ? ` (${flexLabel[lead.date_flexibility]})` : ""}` : lead.date_flexibility ? flexLabel[lead.date_flexibility] : null],
    ["Nights", lead.duration_nights],
    ["Travellers", travellers.length ? travellers.join(", ") : null],
    ["Budget / person", budget],
    ["Travelling from", lead.departure_city],
    ["Submitted on", lead.form_path],
  ];

  return (
    <AdminPage>
      <PageHeader
        back={{ href: "/admin/leads/", label: "Leads" }}
        title={c.name}
        eyebrow={leadRef(lead.lead_number)}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {stage && <Badge tone={stage.kind}>{stage.name}</Badge>}
            {lead.priority === "high" && <Badge tone="high">High priority</Badge>}
            <span>Received {formatAdminDate(lead.created_at, true)}</span>
          </span>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <Card title="Contact">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-caption text-muted">Phone</dt>
                <dd className="mt-0.5 font-medium">{c.phone ? <a href={`tel:${c.phone}`} className="underline">{c.phone}</a> : "Anonymised"}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted">WhatsApp</dt>
                <dd className="mt-0.5 font-medium">
                  {waNumber ? (
                    <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="text-emerald-700 underline">
                      Open chat ↗
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted">Email</dt>
                <dd className="mt-0.5 break-all font-medium">{c.email ? <a href={`mailto:${c.email}`} className="underline">{c.email}</a> : "—"}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted">Consent</dt>
                <dd className="mt-0.5 text-body-sm">
                  {[c.whatsapp_opt_in && "WhatsApp updates", c.marketing && "Email offers"].filter(Boolean).join(", ") || "None"}
                </dd>
              </div>
            </dl>
            {c.other_leads > 0 && <p className="mt-4 rounded-lg bg-sky-50 px-3 py-2 text-caption text-sky-800">Returning customer: {c.other_leads} earlier enquir{c.other_leads === 1 ? "y" : "ies"}.</p>}
          </Card>

          <Card title="Trip details">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {trip
                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([label, v]) => (
                  <div key={label}>
                    <dt className="text-caption text-muted">{label}</dt>
                    <dd className="mt-0.5 text-body-sm">{v}</dd>
                  </div>
                ))}
            </dl>
            {lead.message && (
              <div className="mt-5 rounded-xl bg-[#f7f5f0] p-4">
                <p className="text-caption font-semibold text-muted">Message</p>
                <p className="mt-1 whitespace-pre-wrap text-body-sm">{lead.message}</p>
              </div>
            )}
          </Card>

          <Card title="Where this lead came from" description="Marketing attribution: first visit and the visit that converted">
            <div className="grid gap-4 md:grid-cols-2">
              {lead.touches.map((t) => (
                <div key={t.touch} className="rounded-xl border border-line p-4">
                  <p className="text-caption font-semibold uppercase tracking-wide text-muted">{t.touch === "first" ? "First touch" : "Last touch"}</p>
                  <p className="mt-1 text-[1.1rem] font-semibold">{t.channel ?? "Unknown"}</p>
                  <dl className="mt-3 space-y-1 text-caption">
                    {(
                      [
                        ["Source", t.utm_source],
                        ["Medium", t.utm_medium],
                        ["Campaign", t.utm_campaign],
                        ["Term", t.utm_term],
                        ["Content", t.utm_content],
                        ["Google click", t.gclid && "gclid ✓"],
                        ["Meta click", t.fbclid && "fbclid ✓"],
                        ["Landing page", t.landing_path],
                        ["Referrer", t.referrer],
                        ["Device", t.device_type],
                      ] as const
                    )
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-2">
                          <dt className="text-muted">{k}</dt>
                          <dd className="break-all">{v}</dd>
                        </div>
                      ))}
                  </dl>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6">
          <LeadWorkPanel
            leadId={lead.id}
            canUpdate={canUpdate}
            canAssignOthers={session.can("leads", "update_all")}
            me={session.id}
            stages={opts.stages}
            staff={opts.staff}
            initial={{
              stage_id: lead.stage_id,
              assigned_to: lead.assigned_to ?? "",
              priority: lead.priority,
              next_follow_up_at: lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toISOString() : "",
              lost_reason: lead.lost_reason ?? "",
            }}
            activities={lead.activities}
            stageNames={Object.fromEntries(opts.stages.map((s) => [s.id, s.name]))}
            staffNames={Object.fromEntries(opts.staff.map((s) => [s.id, s.name]))}
          />
          <p className="text-center text-caption text-muted">
            <Link href="/admin/leads/" className="underline">
              Back to all leads
            </Link>
          </p>
        </div>
      </div>
    </AdminPage>
  );
}

// Per-request admin page (reads the signed-in user): render on the server, no instant-navigation prerender.
export const instant = false;
