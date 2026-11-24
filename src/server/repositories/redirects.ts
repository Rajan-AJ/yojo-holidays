import "server-only";
import { pool, query } from "@/lib/db";

export type RedirectRule = { to: string; status: 301 | 302 | 307 | 308 };

/** All active redirects, keyed by from_path (managed in the CMS; slug changes add them automatically). */
export async function findActiveRedirects(): Promise<Map<string, RedirectRule>> {
  const rows = await query<{ from_path: string; to_path: string; status_code: RedirectRule["status"] }>(
    `select from_path, to_path, status_code from public.redirects where is_active`,
  );
  return new Map(rows.map((r) => [r.from_path, { to: r.to_path, status: r.status_code }]));
}

/** Best-effort hit counter (never blocks or fails a request). */
export function recordRedirectHit(fromPath: string) {
  pool
    .query(`update public.redirects set hit_count = hit_count + 1, last_hit_at = now() where from_path = $1`, [fromPath])
    .catch(() => {});
}
