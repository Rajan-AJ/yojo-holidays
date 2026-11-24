import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/admin/session";
import { leadFormOptions, leadRef, listLeads, LEADS_PAGE } from "@/server/admin/leads";
import { AdminPage, Badge, EmptyState, PageHeader, adminButton, formatAdminDate } from "@/components/admin/ui";
import { cn } from "@/lib/cn";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 100);

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  const session = await requireStaff();
  if (!session.can("leads", "read_all") && !session.can("leads", "read_assigned")) notFound();
  const sp = await searchParams;
  const filters = {
    stage: first(sp.stage),
    assigned: first(sp.assigned),
    channel: first(sp.channel),
    type: first(sp.type),
    q: first(sp.q),
    page: Number(first(sp.page)) || 1,
  };
  const [{ rows, total, page }, opts] = await Promise.all([listLeads(session, filters), leadFormOptions()]);
  const pages = Math.max(1, Math.ceil(total / LEADS_PAGE));
  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...filters, page: undefined, ...extra }).filter((e): e is [string, string] => Boolean(e[1]) && e[1] !== "undefined"));
    return `/admin/leads/${p.toString() ? `?${p}` : ""}`;
  };
  const select = "min-h-10 rounded-xl border border-line-strong bg-white px-3 text-body-sm";

  return (
    <AdminPage>
      <PageHeader
        title="Leads"
        eyebrow="Sales"
        description={!session.can("leads", "read_all") ? "You see leads assigned to you and unassigned leads." : undefined}
        actions={
          session.can("leads", "export") && (
            <a href={`/admin/leads/export/${qs({}).replace("/admin/leads/", "")}`} className={adminButton.secondary}>
              Export CSV
            </a>
          )
        }
      />

      <form action="/admin/leads/" className="mb-5 flex flex-wrap gap-2">
        <input type="search" name="q" defaultValue={filters.q} placeholder="Name, phone, email or YJ-number" className={cn(select, "w-72")} />
        <select name="stage" defaultValue={filters.stage ?? ""} className={select} aria-label="Stage">
          <option value="">All stages (no spam)</option>
          {opts.stages.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="assigned" defaultValue={filters.assigned ?? ""} className={select} aria-label="Assigned">
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="none">Unassigned</option>
        </select>
        <select name="channel" defaultValue={filters.channel ?? ""} className={select} aria-label="Source">
          <option value="">All sources</option>
          {opts.channels.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={filters.type ?? ""} className={select} aria-label="Enquiry type">
          <option value="">All types</option>
          <option value="package">Package</option>
          <option value="custom_trip">Custom trip</option>
          <option value="visa">Visa</option>
          <option value="callback">Callback</option>
          <option value="general">General</option>
        </select>
        <button type="submit" className={adminButton.primary}>
          Filter
        </button>
        <Link href="/admin/leads/" className={adminButton.ghost}>
          Reset
        </Link>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No leads match">New enquiries from the website appear here automatically.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-left text-body-sm">
            <thead className="border-b border-line bg-[#fafaf8] text-caption uppercase tracking-wide text-muted">
              <tr>
                {["Ref", "Customer", "Trip", "Stage", "Source", "Assigned", "Follow-up", "Received"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((l) => (
                <tr key={l.id} className="hover:bg-[#fbfaf7]">
                  <td className="px-4 py-3 font-mono text-caption">
                    <Link href={`/admin/leads/${l.id}/`} className="hover:underline">
                      {leadRef(l.lead_number)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/leads/${l.id}/`} className="font-medium hover:underline">
                      {l.name}
                    </Link>
                    <span className="block text-caption text-muted">{l.phone}</span>
                  </td>
                  <td className="max-w-56 truncate px-4 py-3">{l.trip ?? <span className="text-muted">{l.enquiry_type.replace("_", " ")}</span>}</td>
                  <td className="px-4 py-3">
                    <Badge tone={l.priority === "high" ? "high" : l.stage_kind}>{l.stage}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{l.channel ?? "—"}</td>
                  <td className="px-4 py-3">{l.assigned ?? <span className="text-amber-700">Unassigned</span>}</td>
                  <td className={cn("px-4 py-3", l.next_follow_up_at && l.next_follow_up_at < new Date() ? "text-rose-700" : "text-muted")}>
                    {l.next_follow_up_at ? formatAdminDate(l.next_follow_up_at, true) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatAdminDate(l.created_at, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between text-body-sm text-muted">
          <span>
            {total} leads · page {page} of {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={qs({ page: String(page - 1) })} className={adminButton.secondary}>
                Previous
              </Link>
            )}
            {page < pages && (
              <Link href={qs({ page: String(page + 1) })} className={adminButton.secondary}>
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </AdminPage>
  );
}

// Per-request admin page (reads the signed-in user): render on the server, no instant-navigation prerender.
export const instant = false;
