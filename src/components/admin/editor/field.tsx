"use client";

import { useId, useState } from "react";
import { emptyValues, optionsKey, type FieldDef, type RelationOptions } from "@/lib/admin/fields";
import { cn } from "@/lib/cn";
import { RichTextInput } from "./rich-text";
import { GalleryInput, MediaInput } from "./media";

export const inputClass =
  "w-full min-h-10 rounded-xl border border-line-strong bg-white px-3.5 text-body-sm text-ink placeholder:text-muted/70 " +
  "transition-colors hover:border-ink/40 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:bg-[#f4f3f0]";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export type FieldProps = {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Sibling values (slug fields read their source field). */
  siblings: Record<string, unknown>;
  options: RelationOptions;
  errors: Record<string, string>;
  path: string;
  disabled?: boolean;
};

const widthClass = { full: "sm:col-span-6", half: "sm:col-span-3", third: "sm:col-span-2" } as const;

/** Grid of fields (used for the record and for each child row). */
export function FieldGrid({
  fields,
  values,
  onChange,
  options,
  errors,
  path,
  disabled,
}: {
  fields: FieldDef[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  options: RelationOptions;
  errors: Record<string, string>;
  path: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-x-5 gap-y-5 sm:grid-cols-6">
      {fields.map((f) => (
        <div key={f.name} className={cn("col-span-6", widthClass[f.width ?? (f.type === "children" || f.type === "richtext" ? "full" : "full")])}>
          <Field
            field={f}
            value={values[f.name]}
            onChange={(v) => onChange(f.name, v)}
            siblings={values}
            options={options}
            errors={errors}
            path={path ? `${path}.${f.name}` : f.name}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}

function Label({ htmlFor, field }: { htmlFor?: string; field: FieldDef }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-body-sm font-medium">
      {field.label}
      {field.required && <span className="text-rose-600"> *</span>}
    </label>
  );
}

function Help({ field, error, id }: { field: FieldDef; error?: string; id: string }) {
  return (
    <>
      {field.hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-caption text-muted">
          {field.hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-caption font-medium text-rose-700">
          {error}
        </p>
      )}
    </>
  );
}

export function Field({ field: f, value, onChange, siblings, options, errors, path, disabled }: FieldProps) {
  const id = useId();
  const error = errors[path];
  const aria = { "aria-invalid": error ? true : undefined, "aria-describedby": error ? `${id}-err` : f.hint ? `${id}-hint` : undefined };
  const str = value == null ? "" : String(value);

  switch (f.type) {
    case "text":
    case "email":
    case "url":
    case "phone":
      return (
        <div>
          <Label htmlFor={id} field={f} />
          <input
            id={id}
            type={f.type === "text" ? "text" : f.type === "phone" ? "tel" : f.type}
            value={str}
            maxLength={"max" in f ? f.max : undefined}
            placeholder={"placeholder" in f ? f.placeholder : undefined}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={cn(inputClass, error && "border-rose-400")}
            {...aria}
          />
          <Help field={f} error={error} id={id} />
        </div>
      );
    case "textarea":
      return (
        <div>
          <Label htmlFor={id} field={f} />
          <textarea
            id={id}
            value={str}
            maxLength={f.max}
            rows={f.max && f.max <= 600 ? 3 : 5}
            placeholder={f.placeholder}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={cn(inputClass, "py-2.5", error && "border-rose-400")}
            {...aria}
          />
          <div className="flex justify-between gap-3">
            <Help field={f} error={error} id={id} />
            {f.max && <span className="mt-1.5 shrink-0 text-caption tabular-nums text-muted">{str.length}/{f.max}</span>}
          </div>
        </div>
      );
    case "slug": {
      const source = String(siblings[f.from] ?? "");
      return (
        <div>
          <Label htmlFor={id} field={f} />
          <div className="flex items-stretch overflow-hidden rounded-xl border border-line-strong bg-white focus-within:border-ink">
            {f.prefix && <span className="flex items-center bg-[#f4f3f0] px-3 text-caption text-muted">{f.prefix}</span>}
            <input
              id={id}
              value={str}
              onChange={(e) => onChange(slugify(e.target.value))}
              disabled={disabled}
              className="min-h-10 min-w-0 flex-1 px-3 text-body-sm focus:outline-none"
              {...aria}
            />
            <button
              type="button"
              disabled={disabled || !source}
              onClick={() => onChange(slugify(source))}
              className="border-l border-line px-3 text-caption font-medium text-muted hover:text-ink disabled:opacity-40"
            >
              Generate
            </button>
          </div>
          <Help field={{ ...f, hint: f.hint ?? "Changing a published URL automatically redirects the old one." }} error={error} id={id} />
        </div>
      );
    }
    case "number":
    case "money":
      return (
        <div>
          <Label htmlFor={id} field={f} />
          <div className="relative">
            {f.type === "money" && <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-body-sm text-muted">₹</span>}
            <input
              id={id}
              type="number"
              inputMode="decimal"
              value={str}
              min={f.min}
              max={f.max}
              step={f.type === "money" ? "0.01" : (f.step ?? 1)}
              onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
              disabled={disabled}
              className={cn(inputClass, f.type === "money" && "pl-8", error && "border-rose-400")}
              {...aria}
            />
          </div>
          <Help field={f} error={error} id={id} />
        </div>
      );
    case "boolean":
      return (
        <div className="flex h-full flex-col justify-end">
          <label className="flex min-h-10 cursor-pointer items-center gap-3 text-body-sm">
            <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} disabled={disabled} className="size-4.5 accent-ink" />
            <span className="font-medium">{f.label}</span>
          </label>
          <Help field={f} error={error} id={id} />
        </div>
      );
    case "select":
      return (
        <div>
          <Label htmlFor={id} field={f} />
          <select id={id} value={str} onChange={(e) => onChange(e.target.value || null)} disabled={disabled} className={cn(inputClass, error && "border-rose-400")} {...aria}>
            {!f.required || !str ? <option value="">Choose…</option> : null}
            {f.options.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <Help field={f} error={error} id={id} />
        </div>
      );
    case "date":
      return (
        <div>
          <Label htmlFor={id} field={f} />
          <input id={id} type="date" value={str.slice(0, 10)} onChange={(e) => onChange(e.target.value || null)} disabled={disabled} className={cn(inputClass, error && "border-rose-400")} {...aria} />
          <Help field={f} error={error} id={id} />
        </div>
      );
    case "datetime":
      return (
        <div>
          <Label htmlFor={id} field={f} />
          <DateTimeInput id={id} value={str} onChange={onChange} disabled={disabled} />
          <Help field={f} error={error} id={id} />
        </div>
      );
    case "richtext":
      return (
        <div>
          <Label field={f} />
          <RichTextInput value={value} onChange={onChange} disabled={disabled} invalid={Boolean(error)} />
          <Help field={f} error={error} id={id} />
        </div>
      );
    case "months": {
      const months = Array.isArray(value) ? (value as number[]) : [];
      return (
        <fieldset>
          <legend className="mb-1.5 text-body-sm font-medium">{f.label}</legend>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {MONTHS.map((m, i) => {
              const on = months.includes(i + 1);
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={on}
                  disabled={disabled}
                  onClick={() => onChange(on ? months.filter((x) => x !== i + 1) : [...months, i + 1].sort((a, b) => a - b))}
                  className={cn("rounded-lg border py-2 text-caption font-medium", on ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-muted hover:text-ink")}
                >
                  {m}
                </button>
              );
            })}
          </div>
          <Help field={f} error={error} id={id} />
        </fieldset>
      );
    }
    case "media":
      return (
        <div>
          <Label field={f} />
          <MediaInput value={(value as string) ?? null} onChange={onChange} disabled={disabled} />
          <Help field={f} error={error} id={id} />
        </div>
      );
    case "gallery":
      return (
        <div>
          <Label field={f} />
          <GalleryInput value={(value as string[]) ?? []} onChange={onChange} disabled={disabled} />
          <Help field={f} error={error} id={id} />
        </div>
      );
    case "group": {
      const obj = (value as Record<string, string> | null) ?? {};
      return (
        <fieldset>
          <legend className="mb-1.5 text-body-sm font-medium">{f.label}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {f.keys.map(([k, l]) => (
              <input
                key={k}
                aria-label={l}
                placeholder={l}
                value={obj[k] ?? ""}
                onChange={(e) => onChange({ ...obj, [k]: e.target.value })}
                disabled={disabled}
                className={inputClass}
              />
            ))}
          </div>
        </fieldset>
      );
    }
    case "relation": {
      const opts = options[optionsKey(f)] ?? [];
      return (
        <div>
          <Label htmlFor={id} field={f} />
          <select id={id} value={str} onChange={(e) => onChange(e.target.value || null)} disabled={disabled} className={cn(inputClass, error && "border-rose-400")} {...aria}>
            <option value="">{f.required ? "Choose…" : "None"}</option>
            {opts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Help field={f} error={error} id={id} />
        </div>
      );
    }
    case "multiRelation":
      return (
        <div>
          <Label field={f} />
          <MultiRelationInput
            value={(value as string[]) ?? []}
            onChange={onChange}
            options={options[optionsKey(f)] ?? []}
            sorted={Boolean(f.sorted)}
            disabled={disabled}
          />
          <Help field={f} error={error} id={id} />
        </div>
      );
    case "children":
      return (
        <ChildrenInput
          field={f}
          rows={(value as Record<string, unknown>[]) ?? []}
          onChange={onChange}
          options={options}
          errors={errors}
          path={path}
          disabled={disabled}
        />
      );
  }
}

/** <input type="datetime-local"> in the browser's time zone, stored as ISO (UTC). */
function DateTimeInput({ id, value, onChange, disabled }: { id: string; value: string; onChange: (v: unknown) => void; disabled?: boolean }) {
  const local = value
    ? (() => {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "";
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      })()
    : "";
  return (
    <input
      id={id}
      type="datetime-local"
      value={local}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
      disabled={disabled}
      className={inputClass}
    />
  );
}

function MultiRelationInput({
  value,
  onChange,
  options,
  sorted,
  disabled,
}: {
  value: string[];
  onChange: (v: unknown) => void;
  options: { value: string; label: string }[];
  sorted: boolean;
  disabled?: boolean;
}) {
  const [filter, setFilter] = useState("");
  const labels = new Map(options.map((o) => [o.value, o.label]));
  const available = options.filter((o) => !value.includes(o.value) && o.label.toLowerCase().includes(filter.toLowerCase())).slice(0, 50);
  const move = (i: number, dir: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };
  return (
    <div className="rounded-xl border border-line-strong bg-white p-2">
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-lg bg-[#f1efe9] py-1 pl-2.5 pr-1 text-caption font-medium">
              {labels.get(v) ?? "(removed)"}
              {sorted && i > 0 && (
                <button type="button" onClick={() => move(i, -1)} disabled={disabled} className="px-1 text-muted hover:text-ink" aria-label="Move earlier">
                  ←
                </button>
              )}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} disabled={disabled} className="px-1 text-muted hover:text-rose-700" aria-label={`Remove ${labels.get(v)}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search to add…" disabled={disabled} className="min-h-9 flex-1 rounded-lg px-2 text-body-sm focus:outline-none" />
      </div>
      {filter && (
        <ul className="mt-1 max-h-56 overflow-y-auto border-t border-line pt-1">
          {available.length === 0 && <li className="px-2 py-2 text-caption text-muted">No matches</li>}
          {available.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => {
                  onChange([...value, o.value]);
                  setFilter("");
                }}
                className="w-full rounded-md px-2 py-1.5 text-left text-body-sm hover:bg-[#f4f3f0]"
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChildrenInput({
  field: f,
  rows,
  onChange,
  options,
  errors,
  path,
  disabled,
}: {
  field: Extract<FieldDef, { type: "children" }>;
  rows: Record<string, unknown>[];
  onChange: (v: unknown) => void;
  options: RelationOptions;
  errors: Record<string, string>;
  path: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(rows.length === 0 ? null : null);
  const update = (i: number, name: string, v: unknown) => onChange(rows.map((r, n) => (n === i ? { ...r, [name]: v } : r)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...rows];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
    setOpen(i + dir);
  };
  const hasErrors = (i: number) => Object.keys(errors).some((k) => k.startsWith(`${path}.${i}.`));
  const isDays = f.orderColumn === "day_number";

  return (
    <fieldset>
      <legend className="mb-1 text-body-sm font-semibold">{f.label}</legend>
      {f.hint && <p className="mb-3 text-caption text-muted">{f.hint}</p>}
      <ol className="space-y-2">
        {rows.map((row, i) => {
          const title = f.titleField ? String(row[f.titleField] ?? "") : "";
          const expanded = open === i || hasErrors(i);
          return (
            <li key={String(row.id ?? `new-${i}`)} className={cn("rounded-xl border bg-white", hasErrors(i) ? "border-rose-300" : "border-line")}>
              <div className="flex items-center gap-2 px-3 py-2">
                <button type="button" onClick={() => setOpen(expanded && !hasErrors(i) ? null : i)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={expanded}>
                  <span className="shrink-0 rounded-md bg-[#f1efe9] px-2 py-0.5 text-caption font-semibold tabular-nums text-muted">
                    {isDays ? `Day ${i + 1}` : i + 1}
                  </span>
                  <span className="truncate text-body-sm font-medium">{title || <span className="text-muted">Untitled {f.itemLabel}</span>}</span>
                </button>
                <div className="flex shrink-0 items-center text-muted">
                  <button type="button" disabled={disabled || i === 0} onClick={() => move(i, -1)} className="rounded px-2 py-1 hover:bg-black/5 disabled:opacity-30" aria-label="Move up">
                    ↑
                  </button>
                  <button type="button" disabled={disabled || i === rows.length - 1} onClick={() => move(i, 1)} className="rounded px-2 py-1 hover:bg-black/5 disabled:opacity-30" aria-label="Move down">
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (confirm(`Remove this ${f.itemLabel}?`)) onChange(rows.filter((_, n) => n !== i));
                    }}
                    className="rounded px-2 py-1 hover:bg-rose-50 hover:text-rose-700"
                    aria-label={`Remove ${f.itemLabel}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {expanded && (
                <div className="border-t border-line px-4 pb-5 pt-4">
                  <FieldGrid
                    fields={f.fields}
                    values={row}
                    onChange={(name, v) => update(i, name, v)}
                    options={options}
                    errors={errors}
                    path={`${path}.${i}`}
                    disabled={disabled}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {(!f.max || rows.length < f.max) && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onChange([...rows, emptyValues(f.fields)]);
            setOpen(rows.length);
          }}
          className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 text-body-sm font-medium text-muted hover:border-ink hover:text-ink"
        >
          + Add {f.itemLabel}
        </button>
      )}
    </fieldset>
  );
}
