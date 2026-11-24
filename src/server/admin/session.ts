import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { supabaseConfigured, supabaseServer } from "./supabase";
import { DEV_COOKIE, readDevCookie } from "./dev-auth";

/**
 * The admin Data Access Layer: who is signed in and what they may do.
 *
 * Identity: Supabase Auth (verified with Supabase on every request via
 * auth.getUser(), never trusted from the cookie alone). Authority: our own
 * tables (profiles.is_active + user_roles + role_permissions), the same rows
 * the database's has_permission() and RLS use. super_admin can do everything.
 *
 * Every admin page AND every server action calls this; hiding a button is
 * never the security boundary.
 */

export type AppRole = "super_admin" | "admin" | "editor" | "marketing" | "sales";

export type StaffSession = {
  id: string;
  name: string;
  email?: string;
  roles: AppRole[];
  isSuperAdmin: boolean;
  /** resource -> actions */
  permissions: Record<string, string[]>;
  can: (resource: string, action: string) => boolean;
};

async function currentUserId(): Promise<{ id: string; email?: string } | null> {
  if (supabaseConfigured) {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email } : null;
  }
  const id = readDevCookie((await cookies()).get(DEV_COOKIE)?.value);
  return id ? { id } : null;
}

/** The signed-in, active staff member, or null. Memoised per request. */
export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  const user = await currentUserId();
  if (!user) return null;
  const profile = await queryOne<{ full_name: string; roles: AppRole[] }>(
    `select p.full_name, coalesce(array_agg(ur.role::text) filter (where ur.role is not null), '{}') as roles
       from public.profiles p left join public.user_roles ur on ur.user_id = p.id
      where p.id = $1 and p.is_active group by p.id`,
    [user.id],
  );
  if (!profile || profile.roles.length === 0) return null;

  const isSuperAdmin = profile.roles.includes("super_admin");
  const rows = await query<{ resource: string; actions: string[] }>(
    `select resource, array_agg(distinct action) as actions from public.role_permissions
      where role = any($1::public.app_role[]) group by resource`,
    [profile.roles],
  );
  const permissions = Object.fromEntries(rows.map((r) => [r.resource, r.actions]));
  void query(`update public.profiles set last_seen_at = now() where id = $1 and (last_seen_at is null or last_seen_at < now() - interval '5 minutes')`, [user.id]).catch(() => {});

  return {
    id: user.id,
    name: profile.full_name,
    email: user.email,
    roles: profile.roles,
    isSuperAdmin,
    permissions,
    can: (resource, action) => isSuperAdmin || Boolean(permissions[resource]?.includes(action)),
  };
});

/** For pages: signed-in staff or redirect to the login page. */
export async function requireStaff(): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login/");
  return session;
}

export class PermissionError extends Error {}

/** For server actions: throws unless the staff member has the permission. */
export async function requirePermission(resource: string, action: string): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) throw new PermissionError("Your session has ended. Please sign in again.");
  if (!session.can(resource, action)) throw new PermissionError("You don't have permission to do that.");
  return session;
}
