import "server-only";
import { z } from "zod";
import type { PoolClient } from "pg";
import { query, queryOne, transaction } from "@/lib/db";
import { isColumnField, optionsKey, type FieldDef, type RelationOptions, type SeoValues } from "@/lib/admin/fields";
import { SLUG_PATTERN, toE164 } from "@/server/validation/common";
import { isRichTextDoc } from "@/lib/rich-text";
import type { ResourceDef } from "./resources";
import type { StaffSession } from "./session";

/**
 * Generic CMS engine: list / load / validate / save / delete for any
 * ResourceDef. Table and column names come from resources.ts (constants,
 * identifier-checked at startup); every VALUE is a $n parameter.
 *
 * Saves run in one transaction with the staff member as actor, so the
 * database triggers record created_by/updated_by, write the audit log and
 * enforce publish/delete permissions as a second line of defence.
 */

type Row = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Validation (built from the field definitions)
// ---------------------------------------------------------------------------

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

function fieldSchema(f: FieldDef): z.ZodType {
  const req = Boolean(f.required);
  const msg = `${f.label} is required`;
  // Empty input falls back to the field's default (e.g. sort order 0) before validation.
  const fill = (v: unknown) => {
    const n = emptyToNull(v);
    return (n === null || n === undefined) && f.defaultValue !== undefined ? f.defaultValue : n;
  };
  const nullable = <T extends z.ZodType>(s: T) =>
    req ? z.preprocess(fill, s.nullable()).refine((v) => v !== null && v !== undefined, msg) : z.preprocess(fill, s.nullable().optional());

  switch (f.type) {
    case "text":
    case "textarea":
      return nullable(z.string().trim().max(f.max ?? 500, `${f.label}: at most ${f.max ?? 500} characters`));
    case "email":
      return nullable(z.email(`${f.label}: enter a valid email`).trim().toLowerCase().max(254));
    case "url":
      return nullable(z.string().trim().max(2000).regex(/^https?:\/\//, `${f.label}: must start with https://`));
    case "phone":
      return nullable(
        z.string().transform((v, ctx) => {
          const e = toE164(v);
          if (!e) ctx.addIssue({ code: "custom", message: `${f.label}: enter a valid phone number` });
          return e ?? v;
        }),
      );
    case "slug":
      return nullable(z.string().trim().toLowerCase().max(120).regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens"));
    case "number":
    case "money": {
      let n = z.coerce.number({ error: `${f.label} must be a number` });
      if (f.min !== undefined) n = n.min(f.min, `${f.label}: at least ${f.min}`);
      if (f.max !== undefined) n = n.max(f.max, `${f.label}: at most ${f.max}`);
      if (f.type === "money") n = n.min(0, `${f.label} can't be negative`).max(9_999_999_999);
      else n = n.int(`${f.label} must be a whole number`);
      return nullable(n);
    }
    case "boolean":
      return z.boolean().default(false);
    case "select":
      return nullable(z.enum(f.options.map(([v]) => v) as [string, ...string[]], { error: `${f.label}: choose an option` }));
    case "date":
      return nullable(z.iso.date(`${f.label}: invalid date`));
    case "datetime":
      return nullable(z.iso.datetime({ offset: true, local: true, error: `${f.label}: invalid date` }));
    case "richtext":
      return nullable(
        z.custom((v) => isRichTextDoc(v) && JSON.stringify(v).length < 500_000, `${f.label}: invalid or too long`),
      );
    case "months":
      return z.array(z.number().int().min(1).max(12)).max(12).default([]);
    case "media":
    case "relation":
      return nullable(z.uuid(`${f.label}: invalid selection`));
    case "group": {
      const keys = f.keys.map(([k]) => k);
      return z
        .record(z.string(), z.string().max(300).nullable())
        .nullable()
        .optional()
        .transform((v) => {
          if (!v) return null;
          const out = Object.fromEntries(keys.filter((k) => v[k]?.trim()).map((k) => [k, v[k]!.trim()]));
          return Object.keys(out).length ? out : null;
        });
    }
    case "multiRelation":
    case "gallery":
      return z.array(z.uuid()).max(500).default([]);
    case "children":
      return z
        .array(z.object({ id: z.uuid().optional(), ...shape(f.fields) }))
        .max(f.max ?? 200, `At most ${f.max ?? 200} ${f.itemLabel}s`)
        .default([]);
  }
}

function shape(fields: FieldDef[]) {
  return Object.fromEntries(fields.map((f) => [f.name, fieldSchema(f)]));
}

const seoSchema = z
  .object({
    seo_title: z.preprocess(emptyToNull, z.string().trim().max(120).nullable().optional()),
    meta_description: z.preprocess(emptyToNull, z.string().trim().max(320).nullable().optional()),
    focus_keyword: z.preprocess(emptyToNull, z.string().trim().max(100).nullable().optional()),
    canonical_path: z.preprocess(emptyToNull, z.string().trim().max(2048).regex(/^\//, "Canonical must be a path starting with /").nullable().optional()),
    og_title: z.preprocess(emptyToNull, z.string().trim().max(120).nullable().optional()),
    og_description: z.preprocess(emptyToNull, z.string().trim().max(320).nullable().optional()),
    og_media_id: z.preprocess(emptyToNull, z.uuid().nullable().optional()),
    noindex: z.boolean().default(false),
    nofollow: z.boolean().default(false),
  })
  .optional();

export function recordSchema(res: ResourceDef) {
  const publishing = res.publishable
    ? {
        status: z.enum(["draft", "published", "unpublished", "archived"]).default("draft"),
        published_at: z.preprocess(emptyToNull, z.iso.datetime({ offset: true, local: true }).nullable().optional()),
      }
    : {};
  return z.object({ ...shape([...res.fields, ...(res.side ?? [])]), ...publishing, __seo: seoSchema });
}

export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Friendly messages for database constraint errors. */
export function dbErrorMessage(error: unknown): string {
  const e = error as { code?: string; constraint?: string; message?: string; detail?: string };
  switch (e.code) {
    case "23505":
      return /slug|_key/.test(e.constraint ?? "")
        ? "That URL slug (or name) is already used by another item. Choose a different one."
        : "This would create a duplicate.";
    case "23P01":
      return "Two price seasons of the same plan overlap. Adjust the dates.";
    case "23514":
      return `A value isn't allowed (${e.constraint ?? "check"}). Check numbers, dates and required fields.`;
    case "23503":
      return "This item is still used somewhere else, or refers to something that no longer exists.";
    case "23502":
      return "A required value is missing.";
    case "42501":
      return e.message?.includes("permission denied") ? "You don't have permission to publish, unpublish or delete this." : "Permission denied.";
    default:
      return "Something went wrong while saving. Nothing was changed.";
  }
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

export type ListParams = { q?: string; status?: string; trash?: boolean; page?: number };
export const PAGE_SIZE = 50;

export async function listRecords(res: ResourceDef, params: ListParams) {
  const where: string[] = [];
  const values: unknown[] = [];
  const add = (v: unknown) => {
    values.push(v);
    return `$${values.length}`;
  };
  if (res.softDelete) where.push(params.trash ? "t.deleted_at is not null" : "t.deleted_at is null");
  if (params.q) where.push(`t.${res.titleColumn}::text ilike ${add(`%${params.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`)}`);
  if (res.publishable && params.status) where.push(`t.status = ${add(params.status)}`);
  const whereSql = where.length ? `where ${where.join(" and ")}` : "";
  const page = Math.max(1, params.page ?? 1);

  const cols = res.list.map((c, i) => `${c.sql} as c${i}`).join(", ");
  const [rows, total, counts] = await Promise.all([
    query<Row>(
      `select t.id${res.publishable ? ", t.status" : ""}, t.${res.titleColumn} as title${cols ? `, ${cols}` : ""}
         from public.${res.table} t ${whereSql}
        order by ${res.defaultOrder} limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`,
      values,
    ),
    queryOne<{ n: number }>(`select count(*) as n from public.${res.table} t ${whereSql}`, values),
    res.publishable
      ? query<{ status: string; n: number }>(
          `select status::text, count(*) as n from public.${res.table} t ${res.softDelete ? "where deleted_at is null" : ""} group by status`,
        )
      : Promise.resolve([]),
  ]);
  return { rows, total: total?.n ?? 0, page, statusCounts: Object.fromEntries(counts.map((c) => [c.status, c.n])) };
}

// ---------------------------------------------------------------------------
// Loading a record for the editor
// ---------------------------------------------------------------------------

function toEditorValue(f: FieldDef, v: unknown): unknown {
  if (v === undefined || v === null) return f.type === "months" ? [] : f.type === "boolean" ? false : null;
  if (v instanceof Date) return v.toISOString();
  if (f.type === "select") return String(v);
  return v;
}

async function loadSpecial(db: { query: typeof query }, fields: FieldDef[], row: Row, ownerId: string) {
  const out: Row = {};
  for (const f of fields) {
    if (isColumnField(f)) {
      out[f.name] = toEditorValue(f, row[f.name]);
    } else if (f.type === "multiRelation") {
      const rows = await db.query<{ v: string }>(
        `select ${f.targetFk} as v from public.${f.joinTable} where ${f.ownerFk} = $1 ${f.sorted ? "order by sort_order" : ""}`,
        [ownerId],
      );
      out[f.name] = rows.map((r) => r.v);
    } else if (f.type === "gallery") {
      const rows = await db.query<{ v: string }>(
        `select media_id as v from public.${f.joinTable} where ${f.ownerFk} = $1 and role = 'gallery' order by sort_order`,
        [ownerId],
      );
      out[f.name] = rows.map((r) => r.v);
    } else if (f.type === "children") {
      const rows = await db.query<Row>(`select * from public.${f.table} where ${f.fk} = $1 order by ${f.orderColumn}, id`, [ownerId]);
      out[f.name] = await Promise.all(
        rows.map(async (r) => {
          const flat = f.jsonColumn ? { ...(r[f.jsonColumn] as Row), ...r } : r;
          return { id: r.id, ...(await loadSpecial(db, f.fields, flat, r.id as string)) };
        }),
      );
    }
  }
  return out;
}

export async function loadRecord(res: ResourceDef, id: string | null) {
  const row = res.singleton
    ? await queryOne<Row>(`select * from public.${res.table} limit 1`)
    : await queryOne<Row>(`select * from public.${res.table} where id = $1`, [id]);
  if (!row) return null;
  const values = await loadSpecial({ query }, [...res.fields, ...(res.side ?? [])], row, row.id as string);
  if (res.publishable) {
    values.status = row.status;
    values.published_at = row.published_at instanceof Date ? row.published_at.toISOString() : null;
  }
  if (res.seo) {
    values.__seo =
      (row.seo_meta_id &&
        (await queryOne<SeoValues>(
          `select seo_title, meta_description, focus_keyword, canonical_path, og_title, og_description, og_media_id, noindex, nofollow
             from public.seo_meta where id = $1`,
          [row.seo_meta_id],
        ))) ||
      {};
  }
  return {
    id: String(row.id),
    values,
    deletedAt: row.deleted_at instanceof Date ? row.deleted_at.toISOString() : null,
    title: String(row[res.titleColumn] ?? ""),
    slug: typeof row.slug === "string" ? row.slug : undefined,
  };
}

/** Option lists for every relation / multiRelation field (including nested children). */
export async function loadRelationOptions(fields: FieldDef[]): Promise<RelationOptions> {
  const wanted = new Map<string, { table: string; labelColumn: string; where?: string }>();
  const walk = (list: FieldDef[]) => {
    for (const f of list) {
      if (f.type === "relation" || f.type === "multiRelation") wanted.set(optionsKey(f), f);
      if (f.type === "children") walk(f.fields);
    }
  };
  walk(fields);
  const entries = await Promise.all(
    [...wanted].map(async ([key, f]) => {
      const rows = await query<{ value: string; label: string }>(
        `select id::text as value, ${f.labelColumn}::text as label from public.${f.table}
          ${f.where ? `where ${f.where}` : ""} order by 2 limit 2000`,
      );
      return [key, rows] as const;
    }),
  );
  return Object.fromEntries(entries);
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

const toParam = (f: FieldDef, v: unknown) => {
  if (v === undefined) return null;
  if ((f.type === "richtext" || f.type === "group") && v !== null) return JSON.stringify(v);
  return v;
};

function columnValues(fields: FieldDef[], values: Row, jsonColumn?: string, realColumns?: string[]) {
  const cols: string[] = [];
  const params: unknown[] = [];
  const json: Row = {};
  for (const f of fields.filter(isColumnField)) {
    if (jsonColumn && !realColumns?.includes(f.name)) {
      json[f.name] = values[f.name] ?? null;
      continue;
    }
    cols.push(f.name);
    params.push(toParam(f, values[f.name]));
  }
  if (jsonColumn) {
    cols.push(jsonColumn);
    params.push(JSON.stringify(json));
  }
  return { cols, params };
}

async function saveRelations(db: PoolClient, fields: FieldDef[], values: Row, ownerId: string) {
  for (const f of fields) {
    if (f.type === "multiRelation") {
      await db.query(`delete from public.${f.joinTable} where ${f.ownerFk} = $1`, [ownerId]);
      const ids = [...new Set(values[f.name] as string[])];
      for (const [i, target] of ids.entries()) {
        await db.query(
          `insert into public.${f.joinTable} (${f.ownerFk}, ${f.targetFk}${f.sorted ? ", sort_order" : ""})
           values ($1, $2${f.sorted ? ", $3" : ""}) on conflict do nothing`,
          f.sorted ? [ownerId, target, i] : [ownerId, target],
        );
      }
    } else if (f.type === "gallery") {
      await db.query(`delete from public.${f.joinTable} where ${f.ownerFk} = $1 and role = 'gallery'`, [ownerId]);
      for (const [i, mediaId] of [...new Set(values[f.name] as string[])].entries()) {
        await db.query(
          `insert into public.${f.joinTable} (${f.ownerFk}, media_id, role, sort_order) values ($1, $2, 'gallery', $3)
           on conflict do nothing`,
          [ownerId, mediaId, i],
        );
      }
    } else if (f.type === "children") {
      await saveChildren(db, f, values[f.name] as Row[], ownerId);
    }
  }
}

async function saveChildren(db: PoolClient, f: Extract<FieldDef, { type: "children" }>, rows: Row[], parentId: string) {
  const order = (i: number) => (f.orderColumn === "sort_order" ? i : f.orderColumn === "day_number" ? i + 1 : undefined);
  const insertRow = async (row: Row, i: number) => {
    const { cols, params } = columnValues(f.fields, row, f.jsonColumn, f.realColumns);
    const o = order(i);
    const pairs = cols.map((c, n) => [c, params[n]] as const).filter(([, p]) => p !== null && p !== undefined);
    const allCols = [f.fk, ...pairs.map(([c]) => c), ...(o !== undefined ? [f.orderColumn] : [])];
    const allParams = [parentId, ...pairs.map(([, p]) => p), ...(o !== undefined ? [o] : [])];
    const inserted = await db.query<{ id: string }>(
      `insert into public.${f.table} (${allCols.join(", ")}) values (${allParams.map((_, n) => `$${n + 1}`).join(", ")}) returning id`,
      allParams,
    );
    return inserted.rows[0].id;
  };

  if (f.strategy === "replace") {
    await db.query(`delete from public.${f.table} where ${f.fk} = $1`, [parentId]);
    for (const [i, row] of rows.entries()) {
      const id = await insertRow(row, i);
      await saveRelations(db, f.fields, row, id);
    }
    return;
  }

  // upsert: keep ids stable (other rows may reference them, e.g. departures -> prices)
  const existing = new Set((await db.query<{ id: string }>(`select id from public.${f.table} where ${f.fk} = $1`, [parentId])).rows.map((r) => r.id));
  const kept = new Set<string>();
  for (const [i, row] of rows.entries()) {
    const rowId = typeof row.id === "string" && existing.has(row.id) ? row.id : null;
    if (rowId) {
      const { cols, params } = columnValues(f.fields, row, f.jsonColumn, f.realColumns);
      const o = order(i);
      const sets = [...cols, ...(o !== undefined ? [f.orderColumn] : [])];
      const all = [...params, ...(o !== undefined ? [o] : []), rowId];
      await db.query(`update public.${f.table} set ${sets.map((c, n) => `${c} = $${n + 1}`).join(", ")} where id = $${all.length}`, all);
      kept.add(rowId);
      await saveRelations(db, f.fields, row, rowId);
    } else {
      const id = await insertRow(row, i);
      kept.add(id);
      await saveRelations(db, f.fields, row, id);
    }
  }
  const removed = [...existing].filter((id) => !kept.has(id));
  if (removed.length) await db.query(`delete from public.${f.table} where id = any($1::uuid[])`, [removed]);
}

export type SaveResult = { ok: true; id: string; slug?: string } | { ok: false; fieldErrors?: FieldErrors; error?: string };

export async function saveRecord(res: ResourceDef, id: string | null, raw: unknown, session: StaffSession): Promise<SaveResult> {
  const parsed = recordSchema(res).safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error), error: "Please fix the highlighted fields." };
  const values = parsed.data as Row;
  const allFields = [...res.fields, ...(res.side ?? [])];

  if (res.publishable && !session.can(res.permission, "publish")) {
    // Writers without publish rights may only save drafts (the DB trigger enforces this too).
    const current = id ? await queryOne<{ status: string }>(`select status from public.${res.table} where id = $1`, [id]) : null;
    if (values.status !== (current?.status ?? "draft")) {
      return { ok: false, error: "You can save changes, but publishing or unpublishing needs an editor or admin." };
    }
  }

  try {
    const savedId = await transaction(async (db) => {
      const { cols, params } = columnValues(allFields, values);
      if (res.publishable) {
        cols.push("status", "published_at");
        params.push(values.status, values.published_at ?? null);
      }
      let recordId: string;
      if (res.singleton) {
        await db.query(`update public.${res.table} set ${cols.map((c, i) => `${c} = $${i + 1}`).join(", ")}`, params);
        recordId = "singleton";
      } else if (id) {
        const r = await db.query<{ id: string }>(
          `update public.${res.table} set ${cols.map((c, i) => `${c} = $${i + 1}`).join(", ")} where id = $${params.length + 1} returning id`,
          [...params, id],
        );
        if (!r.rows[0]) throw Object.assign(new Error("not found"), { code: "NOTFOUND" });
        recordId = r.rows[0].id;
      } else {
        // Skip empty values on insert so column defaults apply.
        const keep = params.map((p, i) => [cols[i], p] as const).filter(([, p]) => p !== null && p !== undefined);
        const r = await db.query<{ id: string }>(
          `insert into public.${res.table} (${keep.map(([c]) => c).join(", ")}) values (${keep.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
          keep.map(([, p]) => p),
        );
        recordId = r.rows[0].id;
      }

      if (!res.singleton) {
        await saveRelations(db, allFields, values, recordId);

        if (res.seo && session.can("seo", "write") && values.__seo) {
          const seo = values.__seo as SeoValues;
          const seoCols = ["seo_title", "meta_description", "focus_keyword", "canonical_path", "og_title", "og_description", "og_media_id", "noindex", "nofollow"] as const;
          const seoParams = seoCols.map((c) => seo[c] ?? (c === "noindex" || c === "nofollow" ? false : null));
          const current = await db.query<{ seo_meta_id: string | null }>(`select seo_meta_id from public.${res.table} where id = $1`, [recordId]);
          const seoId = current.rows[0]?.seo_meta_id;
          if (seoId) {
            await db.query(`update public.seo_meta set ${seoCols.map((c, i) => `${c} = $${i + 1}`).join(", ")} where id = $${seoCols.length + 1}`, [...seoParams, seoId]);
          } else if (seoParams.some((v) => v !== null && v !== false)) {
            const ins = await db.query<{ id: string }>(
              `insert into public.seo_meta (${seoCols.join(", ")}) values (${seoCols.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
              seoParams,
            );
            await db.query(`update public.${res.table} set seo_meta_id = $1 where id = $2`, [ins.rows[0].id, recordId]);
          }
        }
        for (const sql of res.afterSave ?? []) await db.query(sql, [recordId]);
      }
      return recordId;
    }, session.id);

    return { ok: true, id: savedId, slug: typeof values.slug === "string" ? values.slug : undefined };
  } catch (error) {
    if ((error as { code?: string }).code === "NOTFOUND") return { ok: false, error: "This item no longer exists." };
    console.error(`[admin] save ${res.key} failed`, error);
    return { ok: false, error: dbErrorMessage(error) };
  }
}

/** Soft delete (trash), restore, or permanent delete. */
export async function changeLifecycle(res: ResourceDef, id: string, action: "trash" | "restore" | "purge", session: StaffSession) {
  try {
    await transaction(async (db) => {
      if (action === "purge" || !res.softDelete) {
        await db.query(`delete from public.${res.table} where id = $1`, [id]);
      } else {
        await db.query(`update public.${res.table} set deleted_at = ${action === "trash" ? "now()" : "null"} where id = $1`, [id]);
      }
    }, session.id);
    return { ok: true as const };
  } catch (error) {
    console.error(`[admin] ${action} ${res.key} failed`, error);
    return { ok: false as const, error: dbErrorMessage(error) };
  }
}
