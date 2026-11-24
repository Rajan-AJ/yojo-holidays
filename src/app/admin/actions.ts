"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import { query, queryOne, transaction } from "@/lib/db";
import { mediaUrl } from "@/lib/media";
import { getResource } from "@/server/admin/resources";
import { changeLifecycle, dbErrorMessage, saveRecord, type SaveResult } from "@/server/admin/crud";
import { getStaffSession, PermissionError, requirePermission, type AppRole } from "@/server/admin/session";
import { supabaseAdmin, supabaseConfigured, supabaseServer } from "@/server/admin/supabase";
import { DEV_COOKIE, devAuthEnabled, devCookieValue } from "@/server/admin/dev-auth";
import { siteConfig } from "@/config/site";

/**
 * Admin server actions. Each one authenticates and authorises on the server
 * (requirePermission), validates input, and writes through a transaction with
 * the staff member as actor (audit triggers). Nothing here trusts the browser.
 */

const fail = (error: unknown) => ({
  ok: false as const,
  error: error instanceof PermissionError ? error.message : dbErrorMessage(error),
});

function refresh(tags: string[]) {
  for (const tag of new Set(tags)) updateTag(tag);
}

// ---------------------------------------------------------------------------
// Generic content
// ---------------------------------------------------------------------------

export async function saveRecordAction(resourceKey: string, id: string | null, values: unknown): Promise<SaveResult> {
  const res = getResource(resourceKey);
  if (!res) return { ok: false, error: "Unknown content type." };
  let session;
  try {
    session = await requirePermission(res.permission, "write");
  } catch (e) {
    return fail(e);
  }
  const result = await saveRecord(res, id, values, session);
  if (result.ok) refresh(res.tags);
  return result;
}

export async function lifecycleAction(resourceKey: string, id: string, action: "trash" | "restore" | "purge") {
  const res = getResource(resourceKey);
  if (!res || res.singleton) return { ok: false as const, error: "Not allowed." };
  try {
    const needed = action === "purge" ? "purge" : res.softDelete ? "delete" : "write";
    const session = await requirePermission(res.permission, needed);
    const result = await changeLifecycle(res, id, action, session);
    if (result.ok) refresh(res.tags);
    return result;
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Media library
// ---------------------------------------------------------------------------

export type MediaItem = { id: string; src: string; alt: string; width: number | null; height: number | null; title: string | null };

export async function listMediaAction(search = "", page = 1): Promise<{ items: MediaItem[]; more: boolean }> {
  await requirePermission("media", "read");
  const size = 40;
  const rows = await query<{ id: string; bucket: string; storage_path: string; alt_text: string; width: number | null; height: number | null; title: string | null }>(
    `select id, bucket, storage_path, alt_text, width, height, title from public.media_assets
      where deleted_at is null and ($1 = '' or alt_text ilike $2 or title ilike $2 or folder ilike $2)
      order by created_at desc limit ${size + 1} offset $3`,
    [search.trim(), `%${search.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`, (Math.max(1, page) - 1) * size],
  );
  return {
    items: rows.slice(0, size).map((r) => ({ id: r.id, src: mediaUrl(r.bucket, r.storage_path), alt: r.alt_text, width: r.width, height: r.height, title: r.title })),
    more: rows.length > size,
  };
}

/** Specific media items (editor thumbnails). */
export async function getMediaAction(ids: string[]): Promise<MediaItem[]> {
  await requirePermission("media", "read");
  const valid = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 100);
  if (valid.length === 0) return [];
  const rows = await query<{ id: string; bucket: string; storage_path: string; alt_text: string; width: number | null; height: number | null; title: string | null }>(
    `select id, bucket, storage_path, alt_text, width, height, title from public.media_assets where id = any($1::uuid[])`,
    [valid],
  );
  return rows.map((r) => ({ id: r.id, src: mediaUrl(r.bucket, r.storage_path), alt: r.alt_text, width: r.width, height: r.height, title: r.title }));
}

const ALLOWED = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" } as const;
const MAX_BYTES = 10 * 1024 * 1024;

const uploadMeta = z.object({
  alt: z.string().trim().max(300).default(""),
  folder: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{0,40}$/).default("general"),
  width: z.coerce.number().int().positive().max(20000).optional(),
  height: z.coerce.number().int().positive().max(20000).optional(),
});

export async function uploadMediaAction(formData: FormData): Promise<{ ok: true; item: MediaItem } | { ok: false; error: string }> {
  let session;
  try {
    session = await requirePermission("media", "write");
  } catch (e) {
    return fail(e);
  }
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Choose an image to upload." };
  const ext = ALLOWED[file.type as keyof typeof ALLOWED];
  if (!ext) return { ok: false, error: "Use a JPG, PNG, WebP or AVIF image." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Images must be 10 MB or smaller." };
  const meta = uploadMeta.safeParse(Object.fromEntries(formData));
  if (!meta.success) return { ok: false, error: "Invalid image details." };

  const path = `${meta.data.folder || "general"}/${new Date().getFullYear()}/${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  let bucket: string;
  const admin = supabaseAdmin();
  if (admin) {
    const { error } = await admin.storage.from("media").upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: "31536000" });
    if (error) {
      console.error("[admin] storage upload failed", error.message);
      return { ok: false, error: "Upload failed. Please try again." };
    }
    bucket = "media";
  } else if (devAuthEnabled) {
    // Local development without Supabase Storage: files go to public/uploads (gitignored).
    const target = join(process.cwd(), "public", "uploads", path);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, bytes);
    bucket = "local";
  } else {
    return { ok: false, error: "Image storage isn't configured (SUPABASE_SERVICE_ROLE_KEY)." };
  }

  const row = await transaction(
    (db) =>
      db
        .query<{ id: string }>(
          `insert into public.media_assets (bucket, storage_path, mime_type, size_bytes, width, height, alt_text, title, folder, uploaded_by)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
          [bucket, path, file.type, file.size, meta.data.width ?? null, meta.data.height ?? null, meta.data.alt, file.name.slice(0, 200), meta.data.folder, session.id],
        )
        .then((r) => r.rows[0]),
    session.id,
  );
  return { ok: true, item: { id: row.id, src: mediaUrl(bucket, path), alt: meta.data.alt, width: meta.data.width ?? null, height: meta.data.height ?? null, title: file.name } };
}

const mediaEdit = z.object({
  alt_text: z.string().trim().max(300),
  title: z.string().trim().max(200).nullable(),
  caption: z.string().trim().max(500).nullable(),
  credit: z.string().trim().max(200).nullable(),
});

export async function updateMediaAction(id: string, values: unknown) {
  try {
    const session = await requirePermission("media", "write");
    const v = mediaEdit.parse(values);
    await transaction(
      (db) => db.query(`update public.media_assets set alt_text = $1, title = $2, caption = $3, credit = $4 where id = $5`, [v.alt_text, v.title || null, v.caption || null, v.credit || null, id]),
      session.id,
    );
    refresh(["packages", "destinations", "blog", "visa", "categories", "reviews", "settings"]);
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteMediaAction(id: string) {
  try {
    const session = await requirePermission("media", "delete");
    await transaction((db) => db.query(`update public.media_assets set deleted_at = now() where id = $1`, [id]), session.id);
    refresh(["packages", "destinations", "blog", "visa", "categories", "reviews", "settings"]);
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

/** Same rule as the leads RLS policy: all leads, or own + unassigned. */
async function leadAccess(leadId: string, need: "read" | "update") {
  const session = await getStaffSession();
  if (!session) throw new PermissionError("Your session has ended. Please sign in again.");
  const lead = await queryOne<{ assigned_to: string | null }>(`select assigned_to from public.leads where id = $1`, [leadId]);
  if (!lead) throw new PermissionError("Lead not found.");
  const all = session.can("leads", need === "read" ? "read_all" : "update_all");
  const own = session.can("leads", need === "read" ? "read_assigned" : "update_assigned") && (!lead.assigned_to || lead.assigned_to === session.id);
  if (!all && !own) throw new PermissionError("You don't have access to this lead.");
  return session;
}

const leadUpdate = z.object({
  stage_id: z.uuid(),
  assigned_to: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable()),
  priority: z.enum(["low", "normal", "high"]),
  next_follow_up_at: z.preprocess((v) => (v === "" ? null : v), z.iso.datetime({ local: true, offset: true }).nullable()),
  lost_reason: z.preprocess((v) => (v === "" ? null : v), z.string().trim().max(500).nullable()),
});

export async function updateLeadAction(leadId: string, values: unknown) {
  try {
    const session = await leadAccess(leadId, "update");
    const v = leadUpdate.parse(values);
    // Sales can't hand a lead to someone else unless they can update all leads.
    if (!session.can("leads", "update_all") && v.assigned_to && v.assigned_to !== session.id) {
      throw new PermissionError("Only admins can assign leads to other people.");
    }
    await transaction(
      (db) =>
        db.query(
          `update public.leads set stage_id = $1, assigned_to = $2, priority = $3, next_follow_up_at = $4, lost_reason = $5 where id = $6`,
          [v.stage_id, v.assigned_to, v.priority, v.next_follow_up_at, v.lost_reason, leadId],
        ),
      session.id,
    );
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

const leadNote = z.object({
  type: z.enum(["note", "call", "whatsapp", "email", "meeting"]),
  body: z.string().trim().min(1, "Write something first").max(5000),
});

export async function addLeadActivityAction(leadId: string, values: unknown) {
  try {
    const session = await leadAccess(leadId, "update");
    const v = leadNote.parse(values);
    await transaction(
      (db) => db.query(`insert into public.lead_activities (lead_id, type, body, actor_id) values ($1, $2, $3, $4)`, [leadId, v.type, v.body, session.id]),
      session.id,
    );
    return { ok: true as const };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false as const, error: e.issues[0]?.message ?? "Invalid note" };
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Sign in / out
// ---------------------------------------------------------------------------

const credentials = z.object({ email: z.email().trim().toLowerCase(), password: z.string().min(1).max(200) });

export async function signInAction(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  if (!supabaseConfigured) return { error: "Supabase Auth isn't configured." };
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter your email and password." };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Same message for every failure: don't reveal which accounts exist.
  if (error) return { error: "Incorrect email or password." };
  if (!(await getStaffSession())) {
    await supabase.auth.signOut();
    return { error: "This account doesn't have admin access." };
  }
  redirect("/admin/");
}

export async function sendPasswordResetAction(_prev: { message?: string }, formData: FormData): Promise<{ message?: string }> {
  if (!supabaseConfigured) return { message: "Supabase Auth isn't configured." };
  const email = z.email().safeParse(formData.get("email"));
  if (email.success) {
    const supabase = await supabaseServer();
    await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${siteConfig.url}/admin/login/` });
  }
  return { message: "If that email has an admin account, a reset link is on its way." };
}

export async function signOutAction() {
  if (supabaseConfigured) await (await supabaseServer()).auth.signOut();
  (await cookies()).delete(DEV_COOKIE);
  redirect("/admin/login/");
}

/** LOCAL DEVELOPMENT ONLY (see dev-auth.ts). */
export async function devSignInAction(formData: FormData) {
  if (!devAuthEnabled) throw new Error("Not available");
  const id = z.uuid().parse(formData.get("profileId"));
  (await cookies()).set(DEV_COOKIE, devCookieValue(id), { httpOnly: true, sameSite: "lax", path: "/admin", secure: false });
  redirect("/admin/");
}

/** LOCAL DEVELOPMENT ONLY: create a local super admin when none exists. */
export async function devCreateAdminAction() {
  if (!devAuthEnabled) throw new Error("Not available");
  const id = await transaction(async (db) => {
    const user = await db.query<{ id: string }>(`insert into auth.users (email) values ('admin@localhost') on conflict (email) do update set email = excluded.email returning id`);
    const uid = user.rows[0].id;
    await db.query(`insert into public.profiles (id, full_name) values ($1, 'Local Admin') on conflict (id) do nothing`, [uid]);
    await db.query(`insert into public.user_roles (user_id, role) values ($1, 'super_admin') on conflict do nothing`, [uid]);
    return uid;
  });
  (await cookies()).set(DEV_COOKIE, devCookieValue(id), { httpOnly: true, sameSite: "lax", path: "/admin", secure: false });
  redirect("/admin/");
}

// ---------------------------------------------------------------------------
// Team (super admin)
// ---------------------------------------------------------------------------

const ROLES = ["super_admin", "admin", "editor", "marketing", "sales"] as const;
const invite = z.object({ email: z.email().trim().toLowerCase(), full_name: z.string().trim().min(1).max(200), role: z.enum(ROLES) });

export async function inviteUserAction(
  _prev: { error?: string; message?: string },
  formData: FormData,
): Promise<{ error?: string; message?: string }> {
  try {
    const session = await requirePermission("users", "manage");
    const v = invite.parse(Object.fromEntries(formData));
    let userId: string;
    const admin = supabaseAdmin();
    if (admin) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(v.email, { redirectTo: `${siteConfig.url}/admin/login/` });
      if (error || !data.user) return { error: error?.message ?? "Invitation failed." };
      userId = data.user.id;
    } else if (devAuthEnabled) {
      userId = (await queryOne<{ id: string }>(`insert into auth.users (email) values ($1) on conflict (email) do update set email = excluded.email returning id`, [v.email]))!.id;
    } else {
      return { error: "Supabase isn't configured (SUPABASE_SERVICE_ROLE_KEY)." };
    }
    await transaction(async (db) => {
      await db.query(`insert into public.profiles (id, full_name) values ($1, $2) on conflict (id) do update set full_name = excluded.full_name, is_active = true`, [userId, v.full_name]);
      await db.query(`insert into public.user_roles (user_id, role, granted_by) values ($1, $2, $3) on conflict do nothing`, [userId, v.role, session.id]);
    }, session.id);
    return { message: admin ? `Invitation sent to ${v.email}.` : `Local user ${v.email} created.` };
  } catch (e) {
    if (e instanceof z.ZodError) return { error: "Enter a name, a valid email and a role." };
    return { error: fail(e).error };
  }
}

export async function setUserRolesAction(userId: string, roles: string[]) {
  try {
    const session = await requirePermission("users", "manage");
    const wanted = z.array(z.enum(ROLES)).min(1, "Give at least one role").parse(roles) as AppRole[];
    await transaction(async (db) => {
      await db.query(`delete from public.user_roles where user_id = $1 and not (role = any($2::public.app_role[]))`, [userId, wanted]);
      for (const role of wanted) {
        await db.query(`insert into public.user_roles (user_id, role, granted_by) values ($1, $2, $3) on conflict do nothing`, [userId, role, session.id]);
      }
    }, session.id);
    return { ok: true as const };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false as const, error: e.issues[0]?.message ?? "Invalid roles" };
    return fail(e);
  }
}

export async function setUserActiveAction(userId: string, active: boolean) {
  try {
    const session = await requirePermission("users", "manage");
    if (userId === session.id && !active) return { ok: false as const, error: "You can't deactivate yourself." };
    await transaction((db) => db.query(`update public.profiles set is_active = $1 where id = $2`, [active, userId]), session.id);
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}
