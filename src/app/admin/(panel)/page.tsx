import Link from "next/link";
import { requireStaff } from "@/server/admin/session";
import { dashboardStats, leadRef } from "@/server/admin/leads";
import { AdminPage, Card, PageHeader, adminButton, formatAdminDate } from "@/components/admin/ui";

export default async function Dashboard() {
  const session = await requireStaff();
  const { leads, byChannel, byStage, content, followUps } = await dashboardStats(session);
  const firstName = session.name.split(" ")[0];
  const maxChannel = Math.max(1, ...byChannel.map((c) => c.n));

  return (
    <AdminPage>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        eyebrow="Dashboard"
        actions={
          <>
            {session.can("packages", "write") && (
              <Link href="/admin/packages/new/" className={adminButton.primary}>
                + New package
              </Link>
            )}
            {session.can("blog", "write") && (
              <Link href="/admin/blog/new/" className={adminButton.secondary}>
                + New blog post
              </Link>
            )}
          </>
        }
      />

      {leads && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["New today", leads.today],
            ["Last 7 days", leads.week],
            ["Last 30 days", leads.month],
            ["Open leads", leads.open],
            ["Booked (30 days)", leads.won_month],
          ].map(([label, n]) => (
            <Card key={String(label)}>
              <p className="text-caption font-medium uppercase tracking-wide text-muted">{label}</p>
              <p className="mt-2 font-display text-[2.2rem] leading-none tabular-nums">{n}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {leads && (
          <Card title="Leads by source" description="First touch, last 30 days (spam excluded)" className="xl:col-span-2">
            {byChannel.length === 0 ? (
              <p className="text-body-sm text-muted">No leads in the last 30 days yet.</p>
            ) : (
              <ul className="space-y-3">
                {byChannel.map((c) => (
                  <li key={c.channel} className="grid grid-cols-[9rem_1fr_5rem] items-center gap-3 text-body-sm">
                    <span className="truncate">{c.channel}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-[#efece5]">
                      <span className="block h-full rounded-full bg-brand-navy" style={{ width: `${(c.n / maxChannel) * 100}%` }} />
                    </span>
                    <span className="text-right tabular-nums text-muted">
                      {c.n}
                      {c.won > 0 && <span className="text-emerald-700"> · {c.won} won</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {leads && (
          <Card title="Pipeline" description="Open leads by stage">
            <ul className="divide-y divide-line">
              {byStage.map((s) => (
                <li key={s.code}>
                  <Link href={`/admin/leads/?stage=${s.code}`} className="flex justify-between py-2.5 text-body-sm hover:text-ink">
                    <span>{s.stage}</span>
                    <span className="font-semibold tabular-nums">{s.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {followUps.length > 0 && (
          <Card title="Your follow-ups" description="Due today or overdue">
            <ul className="divide-y divide-line">
              {followUps.map((f) => (
                <li key={f.id}>
                  <Link href={`/admin/leads/${f.id}/`} className="flex justify-between gap-3 py-2.5 text-body-sm">
                    <span className="truncate">
                      <span className="font-mono text-caption text-muted">{leadRef(f.lead_number)}</span> {f.name}
                    </span>
                    <span className={f.next_follow_up_at < new Date() ? "text-rose-700" : "text-muted"}>{formatAdminDate(f.next_follow_up_at, true)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title="Website content">
          <dl className="grid grid-cols-2 gap-4">
            {[
              ["Published packages", content?.packages, "/admin/packages/?status=published"],
              ["Draft packages", content?.drafts, "/admin/packages/?status=draft"],
              ["Destinations", content?.destinations, "/admin/destinations/"],
              ["Blog posts", content?.posts, "/admin/blog/"],
              ["Scheduled", content?.scheduled, "/admin/packages/"],
            ].map(([label, n, href]) => (
              <Link key={String(label)} href={String(href)} className="rounded-xl bg-[#f7f5f0] p-3 hover:bg-[#f1eee6]">
                <dt className="text-caption text-muted">{label}</dt>
                <dd className="mt-1 text-[1.4rem] font-semibold tabular-nums">{n ?? 0}</dd>
              </Link>
            ))}
          </dl>
        </Card>
      </div>
    </AdminPage>
  );
}

// Per-request admin page (reads the signed-in user): render on the server, no instant-navigation prerender.
export const instant = false;
