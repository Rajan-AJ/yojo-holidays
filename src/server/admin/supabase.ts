import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

/** Supabase Auth is used when the project URL + anon key are configured. */
export const supabaseConfigured = Boolean(serverEnv.NEXT_PUBLIC_SUPABASE_URL && serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Per-request client bound to the auth cookies (sign in / out, current user). */
export async function supabaseServer() {
  if (!supabaseConfigured) throw new Error("Supabase is not configured");
  const store = await cookies();
  return createServerClient(serverEnv.NEXT_PUBLIC_SUPABASE_URL!, serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are refreshed by src/proxy.ts instead.
        }
      },
    },
  });
}

/**
 * Service-role client. SERVER ONLY: bypasses RLS. Used for staff invitations
 * (auth.admin) and Storage uploads. Never pass it, or its key, to the browser.
 */
export function supabaseAdmin() {
  if (!serverEnv.NEXT_PUBLIC_SUPABASE_URL || !serverEnv.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(serverEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
