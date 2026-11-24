/**
 * Field definitions for the admin editor. Pure, serialisable data: the server
 * builds validation + SQL from them, the client renders inputs from them.
 * Column / table names here are constants from our own code (never user input)
 * and are checked against an identifier pattern before use in SQL.
 */

type Base = {
  /** Column name (or a virtual name for relation/children fields). */
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  /** Layout width in the editor grid. */
  width?: "full" | "half" | "third";
  /** Value for new records / new rows. */
  defaultValue?: string | number | boolean;
};

export type FieldDef =
  | (Base & { type: "text" | "textarea" | "email" | "url"; max?: number; placeholder?: string })
  | (Base & { type: "phone" })
  | (Base & { type: "slug"; from: string; prefix: string })
  | (Base & { type: "number" | "money"; min?: number; max?: number; step?: number })
  | (Base & { type: "boolean" })
  | (Base & { type: "select"; options: [value: string, label: string][] })
  | (Base & { type: "date" | "datetime" })
  | (Base & { type: "richtext" })
  | (Base & { type: "months" })
  | (Base & { type: "media" })
  | (Base & { type: "group"; keys: [key: string, label: string][] })
  | (Base & { type: "relation"; table: string; labelColumn: string; where?: string })
  | (Base & {
      type: "multiRelation";
      joinTable: string;
      ownerFk: string;
      targetFk: string;
      table: string;
      labelColumn: string;
      /** Join table has a sort_order column: the chosen order is saved. */
      sorted?: boolean;
      where?: string;
    })
  | (Base & { type: "gallery"; joinTable: string; ownerFk: string })
  | (Base & {
      type: "children";
      table: string;
      fk: string;
      /** "sort_order" (any order) or e.g. "day_number" (1, 2, 3...). */
      orderColumn: string;
      /** replace = delete + re-insert on save (safe when nothing else references the rows). */
      strategy: "upsert" | "replace";
      itemLabel: string;
      /** Field shown as the collapsed row title. */
      titleField?: string;
      fields: FieldDef[];
      max?: number;
      /** Store fields not listed in realColumns inside this jsonb column (page_sections.content). */
      jsonColumn?: string;
      realColumns?: string[];
    });

export type FieldType = FieldDef["type"];

/** Values in the editor: the shape the server action receives as JSON. */
export type RecordValues = Record<string, unknown>;

export type RelationOptions = Record<string, { value: string; label: string }[]>;

export type SeoValues = {
  seo_title?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  canonical_path?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_media_id?: string | null;
  noindex?: boolean;
  nofollow?: boolean;
};

export type EditorConfig = {
  key: string;
  singular: string;
  fields: FieldDef[];
  /** Sidebar fields (status, flags...). */
  side: FieldDef[];
  publishable: boolean;
  seo: boolean;
  softDelete: boolean;
  /** Public URL of a record: prefix + slug (for "View on site"). */
  publicPrefix?: string;
  canWrite: boolean;
  canPublish: boolean;
  canDelete: boolean;
  canSeo: boolean;
  singleton: boolean;
  /** Column holding the record's title (live heading). */
  titleField: string;
};

/** Key shared by server and editor for a relation field's option list. */
export function optionsKey(f: { table: string; labelColumn: string; where?: string }) {
  return `${f.table}|${f.labelColumn}|${f.where ?? ""}`;
}

/** Fields stored in the row's own columns (not join tables / child tables). */
export function isColumnField(f: FieldDef) {
  return f.type !== "multiRelation" && f.type !== "gallery" && f.type !== "children";
}

/** Initial values for a new record or a new child row. */
export function emptyValues(fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.defaultValue !== undefined) out[f.name] = f.defaultValue;
    else if (f.type === "boolean") out[f.name] = false;
    else if (f.type === "multiRelation" || f.type === "gallery" || f.type === "children" || f.type === "months") out[f.name] = [];
    else out[f.name] = null;
  }
  return out;
}
