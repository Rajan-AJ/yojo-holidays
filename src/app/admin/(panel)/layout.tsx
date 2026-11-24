import { Suspense } from "react";
import { requireStaff } from "@/server/admin/session";
import { resources } from "@/server/admin/resources";
import { AdminNav, type NavGroup } from "@/components/admin/nav";
import { signOutAction } from "@/app/admin/actions";

// Every admin page depends on the signed-in user: render on the server per request.
export const instant = false;

async function Shell({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();
  const groups: NavGroup[] = [
    {
      label: "",
      items: [
        { href: "/admin/", label: "Dashboard", icon: "home" },
        ...(session.can("leads", "read_all") || session.can("leads", "read_assigned")
          ? [{ href: "/admin/leads/", label: "Leads", icon: "inbox" as const }]
          : []),
      ],
    },
  ];
  for (const group of ["Travel", "Content", "Visa", "Marketing", "Settings"] as const) {
    const items = resources
      .filter((r) => r.group === group && session.can(r.permission, "read"))
      .map((r) => ({ href: `/admin/${r.key}/`, label: r.plural, icon: "dot" as const }));
    if (group === "Content" && session.can("media", "read")) items.unshift({ href: "/admin/media/", label: "Media library", icon: "dot" });
    if (group === "Settings" && session.can("users", "read")) items.push({ href: "/admin/team/", label: "Team & roles", icon: "dot" });
    if (items.length) groups.push({ label: group, items });
  }

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[16rem_1fr]">
      <AdminNav
        groups={groups}
        user={{ name: session.name, roles: session.roles.map((r) => r.replace("_", " ")) }}
        signOut={signOutAction}
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-10 text-body-sm text-muted">Loading…</div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
