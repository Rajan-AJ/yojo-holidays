import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { supabaseConfigured } from "./supabase";

/**
 * LOCAL DEVELOPMENT SIGN-IN, for working on the admin before a Supabase
 * project exists. Enabled only when ALL of these are true:
 *   - NODE_ENV is "development" (never in a production build)
 *   - Supabase Auth is NOT configured
 *   - the database is local (127.0.0.1 / localhost)
 * The cookie holds a profile id signed with a key derived from DATABASE_URL.
 */
export const devAuthEnabled =
  serverEnv.NODE_ENV === "development" &&
  !supabaseConfigured &&
  /@(127\.0\.0\.1|localhost)(:\d+)?\//.test(serverEnv.DATABASE_URL);

export const DEV_COOKIE = "yojo_dev_staff";

const sign = (value: string) =>
  createHmac("sha256", `yojo-dev:${serverEnv.DATABASE_URL}`).update(value).digest("base64url");

export function devCookieValue(profileId: string) {
  return `${profileId}.${sign(profileId)}`;
}

export function readDevCookie(raw: string | undefined): string | null {
  if (!devAuthEnabled || !raw) return null;
  const [id, signature] = raw.split(".");
  if (!id || !signature) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}
