import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getStaffSession } from "@/server/admin/session";
import { supabaseConfigured } from "@/server/admin/supabase";
import { devAuthEnabled } from "@/server/admin/dev-auth";
import { devCreateAdminAction, devSignInAction } from "@/app/admin/actions";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in" };
export const instant = false;

async function DevSignIn() {
  const staff = await query<{ id: string; full_name: string; roles: string[] }>(
    `select p.id, p.full_name, array_agg(ur.role::text order by ur.role) as roles
       from public.profiles p join public.user_roles ur on ur.user_id = p.id
      where p.is_active group by p.id order by p.full_name`,
  );
  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-caption text-amber-900">
        <strong>Local development sign-in.</strong> Supabase Auth isn&apos;t configured, so you can pick a local staff account. This
        never works in production builds.
      </p>
      {staff.length > 0 ? (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {staff.map((s) => (
            <li key={s.id}>
              <form action={devSignInAction} className="flex items-center justify-between gap-3 px-4 py-3">
                <input type="hidden" name="profileId" value={s.id} />
                <span>
                  <span className="block text-body-sm font-medium">{s.full_name}</span>
                  <span className="text-caption capitalize text-muted">{s.roles.join(", ").replaceAll("_", " ")}</span>
                </span>
                <button type="submit" className="rounded-lg bg-ink px-3 py-1.5 text-caption font-semibold text-white">
                  Sign in
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <form action={devCreateAdminAction}>
          <button type="submit" className="w-full rounded-xl bg-ink px-4 py-3 text-body-sm font-semibold text-white">
            Create a local Super Admin and sign in
          </button>
        </form>
      )}
    </div>
  );
}

async function Content() {
  if (await getStaffSession()) redirect("/admin/");
  if (supabaseConfigured) return <LoginForm />;
  if (devAuthEnabled) return <DevSignIn />;
  return (
    <p className="text-body-sm text-muted">
      Sign-in isn&apos;t configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
    </p>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-brand-navy px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
        <p className="font-display text-2xl">
          Yojo <span className="text-brand-pink">Admin</span>
        </p>
        <h1 className="mt-6 text-h3">Sign in</h1>
        <p className="mt-1 text-body-sm text-muted">For Yojo Holidays staff only.</p>
        <div className="mt-8">
          <Suspense fallback={<p className="text-body-sm text-muted">Loading…</p>}>
            <Content />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
