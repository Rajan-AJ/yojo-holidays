"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { EditorConfig, RecordValues, RelationOptions, SeoValues } from "@/lib/admin/fields";
import { lifecycleAction, saveRecordAction } from "@/app/admin/actions";
import { cn } from "@/lib/cn";
import { Field, FieldGrid, inputClass } from "./field";
import { MediaInput } from "./media";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  unpublished: "Unpublished",
  archived: "Archived",
};

export function RecordEditor({
  config,
  recordId,
  initial,
  options,
  title,
  slug,
  deletedAt,
  backHref,
  backLabel,
}: {
  config: EditorConfig;
  recordId: string | null;
  initial: RecordValues;
  options: RelationOptions;
  title: string;
  slug?: string;
  deletedAt: string | null;
  backHref: string;
  backLabel: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<RecordValues>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(values) !== saved;
  const disabled = !config.canWrite || Boolean(deletedAt);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (name: string, v: unknown) => setValues((prev) => ({ ...prev, [name]: v }));
  const seo = (values.__seo ?? {}) as SeoValues;
  const setSeo = (patch: Partial<SeoValues>) => set("__seo", { ...seo, ...patch });

  const status = String(values.status ?? "draft");
  const publishedAt = values.published_at ? new Date(String(values.published_at)) : null;
  const [openedAt] = useState(() => Date.now());
  const scheduled = status === "published" && publishedAt && publishedAt.getTime() > openedAt;

  const save = (overrides: RecordValues = {}) => {
    const next = { ...values, ...overrides };
    setValues(next);
    setMessage(null);
    start(async () => {
      const result = await saveRecordAction(config.key, recordId, next);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage({ tone: "error", text: result.error ?? "Couldn't save." });
        return;
      }
      setErrors({});
      setSaved(JSON.stringify(next));
      setMessage({ tone: "ok", text: next.status === "published" && status !== "published" ? "Published. The website is updated." : "Saved." });
      if (!recordId && !config.singleton) router.replace(`/admin/${config.key}/${result.id}/`);
      else router.refresh();
    });
  };

  const lifecycle = (action: "trash" | "restore" | "purge") => {
    const prompts = {
      trash: "Move this to the trash? It disappears from the website (you can restore it).",
      restore: "Restore this item?",
      purge: "Delete permanently? This can't be undone.",
    };
    if (!confirm(prompts[action])) return;
    start(async () => {
      const result = await lifecycleAction(config.key, recordId!, action);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      if (action === "restore") router.refresh();
      else router.push(`/admin/${config.key}/`);
    });
  };

  const publicUrl = config.publicPrefix && slug ? (slug === "home" && config.key === "pages" ? "/" : `${config.publicPrefix}${slug}/`) : null;
  const errorCount = Object.keys(errors).length;
  const sideAll = useMemo(() => config.side, [config.side]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link href={backHref} className="text-body-sm text-muted hover:text-ink">
            ← {backLabel}
          </Link>
          <h1 className="mt-2 truncate font-display text-[1.9rem] leading-tight">{String(values[config.titleField] ?? "") || title}</h1>
          <p className="mt-1 text-body-sm text-muted">
            {config.singular}
            {dirty && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-caption font-medium text-amber-800">Unsaved changes</span>}
            {deletedAt && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-caption font-medium text-rose-800">In trash</span>}
            {!config.canWrite && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-caption font-medium">Read only</span>}
          </p>
        </div>
        {publicUrl && recordId && (
          <a href={publicUrl} target="_blank" rel="noreferrer" className="text-body-sm font-medium underline underline-offset-4">
            View on website ↗
          </a>
        )}
      </header>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
            <FieldGrid fields={config.fields} values={values} onChange={set} options={options} errors={errors} path="" disabled={disabled} />
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6">
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-semibold">{config.publishable ? "Publish" : "Save"}</h2>
            {config.publishable && (
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="status" className="mb-1.5 block text-body-sm font-medium">
                    Status
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => set("status", e.target.value)}
                    disabled={disabled || !config.canPublish}
                    className={inputClass}
                  >
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  {!config.canPublish && <p className="mt-1.5 text-caption text-muted">An editor or admin publishes this.</p>}
                </div>
                {status === "published" && (
                  <Field
                    field={{ name: "published_at", label: "Publish date", type: "datetime", hint: "A future date schedules it. Empty = now." }}
                    value={values.published_at}
                    onChange={(v) => set("published_at", v)}
                    siblings={values}
                    options={options}
                    errors={errors}
                    path="published_at"
                    disabled={disabled || !config.canPublish}
                  />
                )}
                {scheduled && <p className="rounded-lg bg-sky-50 px-3 py-2 text-caption text-sky-800">Scheduled: goes live {publishedAt!.toLocaleString("en-IN")}</p>}
              </div>
            )}

            {message && (
              <p role="status" className={cn("mt-4 rounded-lg px-3 py-2 text-body-sm", message.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>
                {message.text}
                {errorCount > 0 && message.tone === "error" && ` (${errorCount} field${errorCount === 1 ? "" : "s"})`}
              </p>
            )}

            {!deletedAt && config.canWrite && (
              <div className="mt-5 flex flex-col gap-2">
                <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-4 text-body-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-50">
                  {pending ? "Saving…" : recordId || config.singleton ? "Save changes" : `Create ${config.singular.toLowerCase()}`}
                </button>
                {config.publishable && config.canPublish && status !== "published" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => save({ status: "published" })}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-600 bg-emerald-600/5 px-4 text-body-sm font-semibold text-emerald-800 hover:bg-emerald-600/10"
                  >
                    Save & publish
                  </button>
                )}
              </div>
            )}

            {recordId && !config.singleton && config.canDelete && (
              <div className="mt-5 border-t border-line pt-4 text-body-sm">
                {deletedAt ? (
                  <div className="flex gap-4">
                    <button type="button" onClick={() => lifecycle("restore")} className="font-medium underline">
                      Restore
                    </button>
                    <button type="button" onClick={() => lifecycle("purge")} className="text-rose-700 underline">
                      Delete permanently
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => lifecycle("trash")} className="text-rose-700 hover:underline">
                    {config.softDelete ? "Move to trash" : "Delete"}
                  </button>
                )}
              </div>
            )}
          </section>

          {sideAll.length > 0 && (
            <section className="rounded-2xl border border-line bg-white p-5">
              <h2 className="mb-4 font-semibold">Settings</h2>
              <FieldGrid fields={sideAll} values={values} onChange={set} options={options} errors={errors} path="" disabled={disabled} />
            </section>
          )}

          {config.seo && <SeoPanel seo={seo} onChange={setSeo} errors={errors} disabled={disabled || !config.canSeo} values={values} urlPrefix={config.publicPrefix} />}
        </aside>
      </div>
    </form>
  );
}

function SeoPanel({
  seo,
  onChange,
  errors,
  disabled,
  values,
  urlPrefix,
}: {
  seo: SeoValues;
  onChange: (p: Partial<SeoValues>) => void;
  errors: Record<string, string>;
  disabled?: boolean;
  values: RecordValues;
  urlPrefix?: string;
}) {
  const fallbackTitle = String(values.name ?? values.title ?? "");
  const fallbackDesc = String(values.short_description ?? values.excerpt ?? values.summary ?? values.description ?? "").slice(0, 160);
  const shownTitle = seo.seo_title || fallbackTitle;
  const shownDesc = seo.meta_description || fallbackDesc;
  const titleLen = (seo.seo_title ?? "").length;
  const descLen = (seo.meta_description ?? "").length;
  const kw = (seo.focus_keyword ?? "").trim().toLowerCase();
  const checks = kw
    ? [
        ["Keyword in SEO title", shownTitle.toLowerCase().includes(kw)],
        ["Keyword in description", shownDesc.toLowerCase().includes(kw)],
        ["Keyword in URL", String(values.slug ?? "").includes(kw.replace(/\s+/g, "-"))],
      ]
    : [];
  const text = (name: keyof SeoValues, label: string, max: number, area = false) => (
    <div>
      <label htmlFor={`seo-${name}`} className="mb-1.5 flex justify-between text-body-sm font-medium">
        {label}
        {max > 0 && <span className={cn("text-caption tabular-nums", String(seo[name] ?? "").length > max ? "text-rose-700" : "text-muted")}>{String(seo[name] ?? "").length}/{max}</span>}
      </label>
      {area ? (
        <textarea id={`seo-${name}`} rows={3} value={String(seo[name] ?? "")} onChange={(e) => onChange({ [name]: e.target.value })} disabled={disabled} className={cn(inputClass, "py-2")} />
      ) : (
        <input id={`seo-${name}`} value={String(seo[name] ?? "")} onChange={(e) => onChange({ [name]: e.target.value })} disabled={disabled} className={inputClass} />
      )}
      {errors[`__seo.${name}`] && <p className="mt-1 text-caption text-rose-700">{errors[`__seo.${name}`]}</p>}
    </div>
  );

  return (
    <details className="group rounded-2xl border border-line bg-white p-5" open={Boolean(seo.seo_title || seo.meta_description)}>
      <summary className="flex cursor-pointer list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
        SEO & social
        <span className="text-muted transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-4 space-y-4">
        <div className="rounded-xl bg-[#f7f5f0] p-3">
          <p className="text-caption text-emerald-800">yojoholidays.com{urlPrefix ?? "/"}{String(values.slug ?? "")}/</p>
          <p className="mt-0.5 line-clamp-1 text-[1.05rem] text-[#1a0dab]">{shownTitle || "Page title"}</p>
          <p className="mt-0.5 line-clamp-2 text-caption text-muted">{shownDesc || "Meta description…"}</p>
        </div>
        {text("seo_title", "SEO title", 60)}
        {titleLen > 60 && <p className="-mt-2 text-caption text-amber-700">Google usually shows about 60 characters.</p>}
        {text("meta_description", "Meta description", 160, true)}
        {descLen > 160 && <p className="-mt-2 text-caption text-amber-700">Google usually shows about 160 characters.</p>}
        {text("focus_keyword", "Focus keyword", 0)}
        {checks.length > 0 && (
          <ul className="space-y-1 text-caption">
            {checks.map(([label, ok]) => (
              <li key={String(label)} className={ok ? "text-emerald-700" : "text-amber-700"}>
                {ok ? "✓" : "○"} {label}
              </li>
            ))}
          </ul>
        )}
        {text("og_title", "Social share title", 60)}
        {text("og_description", "Social share description", 160, true)}
        <div>
          <p className="mb-1.5 text-body-sm font-medium">Social share image</p>
          <MediaInput value={seo.og_media_id ?? null} onChange={(v) => onChange({ og_media_id: v as string | null })} disabled={disabled} />
        </div>
        {text("canonical_path", "Canonical path (advanced)", 0)}
        <label className="flex items-center gap-3 text-body-sm">
          <input type="checkbox" checked={Boolean(seo.noindex)} onChange={(e) => onChange({ noindex: e.target.checked })} disabled={disabled} className="size-4.5 accent-ink" />
          Hide from search engines (noindex)
        </label>
        {disabled && <p className="text-caption text-muted">SEO fields are edited by editors and marketing.</p>}
      </div>
    </details>
  );
}
