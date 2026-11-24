import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { requireStaff } from "@/server/admin/session";
import { supabaseAdmin } from "@/server/admin/supabase";
import { AdminPage, Card, PageHeader, formatAdminDate } from "@/components/admin/ui";
import { TeamManager } from "@/components/admin/team-manager";

export default async function TeamPage() {
  const session = await requireStaff();
  if (!session.can("users", "read")) notFound();
  const members = await query<{ id: string; full_name: string; is_active: boolean; roles: string[]; last_seen_at: Date | null }>(
    `select p.id, p.full_name, p.is_active, p.last_seen_at,
            coalesce(array_agg(ur.role::text order by ur.role) filter (where ur.role is not null), '{}') as roles
       from public.profiles p left join public.user_roles ur on ur.user_id = p.id
      group by p.id order by p.is_active desc, p.full_name`,
  );
  const canManage = session.can("users", "manage");

  return (
    <AdminPage>
      <PageHeader
        title="Team & roles"
        eyebrow="Settings"
        description="Staff sign in with Supabase Auth. Roles decide what each person can see and change; the database enforces the same rules."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <TeamManager
          canManage={canManage}
          me={session.id}
          members={members.map((m) => ({ ...m, last_seen: m.last_seen_at ? formatAdminDate(m.last_seen_at, true) : "Never" }))}
          storageMode={supabaseAdmin() ? "supabase" : "local"}
        />
        <Card title="What each role can do">
          <dl className="space-y-3 text-body-sm">
            {[
              ["Super Admin", "Everything, including team, roles and permanent deletion."],
              ["Admin", "All content, settings, redirects and all leads."],
              ["Editor", "Packages, destinations, blog, visa, FAQs and media. Can publish."],
              ["Marketing", "Blog, pages, FAQs, testimonials, SEO and redirects. Reads and exports all leads."],
              ["Sales", "Works their own and unassigned leads. Reads content."],
            ].map(([r, d]) => (
              <div key={r}>
                <dt className="font-semibold">{r}</dt>
                <dd className="text-muted">{d}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </AdminPage>
  );
}

// Per-request admin page (reads the signed-in user): render on the server, no instant-navigation prerender.
export const instant = false;
