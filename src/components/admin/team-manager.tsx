"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { inviteUserAction, setUserActiveAction, setUserRolesAction } from "@/app/admin/actions";
import { inputClass } from "@/components/admin/editor/field";
import { Badge } from "@/components/admin/ui";
import { cn } from "@/lib/cn";

const ROLES = [
  ["super_admin", "Super Admin"],
  ["admin", "Admin"],
  ["editor", "Editor"],
  ["marketing", "Marketing"],
  ["sales", "Sales"],
] as const;

type Member = { id: string; full_name: string; is_active: boolean; roles: string[]; last_seen: string };

export function TeamManager({ canManage, me, members, storageMode }: { canManage: boolean; me: string; members: Member[]; storageMode: "supabase" | "local" }) {
  const router = useRouter();
  const [state, invite, inviting] = useActionState(inviteUserAction, {});
  const [editing, setEditing] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      {canManage && (
        <form action={invite} className="rounded-2xl border border-line bg-white p-5">
          <h2 className="font-semibold">Invite a team member</h2>
          <p className="mt-1 text-caption text-muted">
            {storageMode === "supabase" ? "They receive an email to set their password." : "Local development: creates a local account (no email is sent)."}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_10rem_auto]">
            <input name="full_name" required placeholder="Full name" className={inputClass} />
            <input name="email" type="email" required placeholder="Email" className={inputClass} />
            <select name="role" defaultValue="editor" className={inputClass} aria-label="Role">
              {ROLES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <button type="submit" disabled={inviting} className="rounded-xl bg-ink px-4 text-body-sm font-semibold text-white">
              {inviting ? "Inviting…" : "Invite"}
            </button>
          </div>
          {state.error && <p className="mt-3 text-body-sm text-rose-700">{state.error}</p>}
          {state.message && <p className="mt-3 text-body-sm text-emerald-700">{state.message}</p>}
        </form>
      )}

      {msg && <p className="rounded-lg bg-rose-50 px-3 py-2 text-body-sm text-rose-800">{msg}</p>}

      <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
        {members.map((m) => (
          <li key={m.id} className={cn("p-4", !m.is_active && "opacity-60")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {m.full_name} {m.id === me && <span className="text-caption text-muted">(you)</span>}
                </p>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  {m.roles.map((r) => (
                    <Badge key={r} tone="open">
                      {r.replace("_", " ")}
                    </Badge>
                  ))}
                  {!m.is_active && <Badge tone="archived">Deactivated</Badge>}
                  <span className="text-caption text-muted">Last seen {m.last_seen}</span>
                </p>
              </div>
              {canManage && (
                <div className="flex gap-3 text-body-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(editing === m.id ? null : m.id);
                      setRoles(m.roles);
                    }}
                    className="underline"
                  >
                    Roles
                  </button>
                  {m.id !== me && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const r = await setUserActiveAction(m.id, !m.is_active);
                          if (!r.ok) setMsg(r.error);
                          router.refresh();
                        })
                      }
                      className={m.is_active ? "text-rose-700 underline" : "underline"}
                    >
                      {m.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  )}
                </div>
              )}
            </div>
            {editing === m.id && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-[#f7f5f0] p-3">
                {ROLES.map(([v, l]) => (
                  <label key={v} className="flex items-center gap-2 text-body-sm">
                    <input
                      type="checkbox"
                      checked={roles.includes(v)}
                      onChange={(e) => setRoles(e.target.checked ? [...roles, v] : roles.filter((r) => r !== v))}
                      className="size-4 accent-ink"
                    />
                    {l}
                  </label>
                ))}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await setUserRolesAction(m.id, roles);
                      if (!r.ok) setMsg(r.error);
                      else {
                        setEditing(null);
                        setMsg(null);
                        router.refresh();
                      }
                    })
                  }
                  className="ml-auto rounded-lg bg-ink px-3 py-1.5 text-body-sm font-semibold text-white"
                >
                  Save roles
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
