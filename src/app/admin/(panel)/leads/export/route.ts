import { getStaffSession } from "@/server/admin/session";
import { leadRef, listLeads } from "@/server/admin/leads";

/** CSV export of the filtered lead list (needs leads.export). Max 5,000 rows per file. */
export async function GET(request: Request) {
  const session = await getStaffSession();
  if (!session || !session.can("leads", "export")) return new Response("Forbidden", { status: 403 });

  const sp = new URL(request.url).searchParams;
  const filters = {
    stage: sp.get("stage") ?? undefined,
    assigned: sp.get("assigned") ?? undefined,
    channel: sp.get("channel") ?? undefined,
    type: sp.get("type") ?? undefined,
    q: sp.get("q")?.slice(0, 100) ?? undefined,
  };
  const all: Awaited<ReturnType<typeof listLeads>>["rows"] = [];
  for (let page = 1; page <= 100; page++) {
    const { rows } = await listLeads(session, { ...filters, page });
    all.push(...rows);
    if (rows.length === 0 || all.length >= 5000) break;
  }

  // Neutralise spreadsheet formulas (=, +, -, @) in user-supplied text.
  const cell = (v: unknown) => {
    let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = ["Reference", "Name", "Phone", "Type", "Trip", "Stage", "Source", "Assigned", "Priority", "Received"];
  const lines = all.map((l) =>
    [leadRef(l.lead_number), l.name, l.phone, l.enquiry_type, l.trip, l.stage, l.channel, l.assigned, l.priority, l.created_at].map(cell).join(","),
  );
  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="yojo-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
