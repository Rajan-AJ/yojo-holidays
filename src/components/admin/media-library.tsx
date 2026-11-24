"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, useTransition } from "react";
import { deleteMediaAction, listMediaAction, updateMediaAction, type MediaItem } from "@/app/admin/actions";
import { uploadFile } from "@/components/admin/editor/media";
import { inputClass } from "@/components/admin/editor/field";
import { cn } from "@/lib/cn";

export function MediaLibrary({ canWrite, canDelete }: { canWrite: boolean; canDelete: boolean }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [form, setForm] = useState({ alt_text: "", title: "", caption: "", credit: "" });
  const [alt, setAlt] = useState("");
  const [folder, setFolder] = useState("general");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const load = useCallback((q: string, p: number) => {
    start(async () => {
      const r = await listMediaAction(q, p);
      setItems((prev) => (p === 1 ? r.items : [...prev, ...r.items]));
      setMore(r.more);
    });
  }, []);
  useEffect(() => load("", 1), [load]);

  const pick = (item: MediaItem) => {
    setSelected(item);
    setForm({ alt_text: item.alt, title: item.title ?? "", caption: "", credit: "" });
    setMsg(null);
  };

  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    if (!alt.trim()) {
      setMsg({ ok: false, text: "Write the alt text first: describe what's in the photo." });
      return;
    }
    start(async () => {
      for (const file of Array.from(files)) {
        const r = await uploadFile(file, alt.trim(), folder);
        if (!r.ok) {
          setMsg({ ok: false, text: r.error });
          return;
        }
        setItems((prev) => [r.item, ...prev]);
      }
      setAlt("");
      setMsg({ ok: true, text: "Uploaded." });
    });
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        {canWrite && (
          <div className="mb-5 rounded-2xl border border-line bg-white p-5">
            <p className="font-semibold">Upload images</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={300} placeholder="Alt text, e.g. Taj Mahal at sunrise seen from the gardens" className={cn(inputClass, "min-w-64 flex-1")} />
              <select value={folder} onChange={(e) => setFolder(e.target.value)} className={cn(inputClass, "w-40")} aria-label="Folder">
                {["general", "packages", "destinations", "blog", "visa", "team", "testimonials"].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <label className="inline-flex min-h-10 cursor-pointer items-center rounded-xl bg-ink px-4 text-body-sm font-semibold text-white">
                {pending ? "Working…" : "Select files"}
                <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => upload(e.target.files)} />
              </label>
            </div>
            <p className="mt-2 text-caption text-muted">JPG, PNG, WebP or AVIF up to 10 MB. Hero photos: landscape, at least 2000 px wide.</p>
          </div>
        )}
        {msg && <p className={cn("mb-4 rounded-lg px-3 py-2 text-body-sm", msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{msg.text}</p>}
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
            load(e.target.value, 1);
          }}
          placeholder="Search by alt text, title or folder…"
          className={cn(inputClass, "mb-4 max-w-md")}
        />
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => pick(item)} className={cn("block w-full text-left", selected?.id === item.id && "ring-2 ring-ink ring-offset-2")}>
                <span className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-[#efece5]">
                  <Image src={item.src} alt={item.alt} fill sizes="240px" className="object-cover" />
                  {!item.alt && <span className="absolute left-2 top-2 rounded bg-amber-400 px-1.5 text-caption font-semibold">No alt</span>}
                </span>
                <span className="mt-1.5 block truncate text-caption text-muted">{item.alt || item.title}</span>
              </button>
            </li>
          ))}
        </ul>
        {more && (
          <button
            type="button"
            onClick={() => {
              setPage(page + 1);
              load(search, page + 1);
            }}
            className="mt-6 text-body-sm font-medium underline"
          >
            Load more
          </button>
        )}
      </div>

      {selected && (
        <aside className="rounded-2xl border border-line bg-white p-5 xl:sticky xl:top-6">
          <span className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-[#efece5]">
            <Image src={selected.src} alt={selected.alt} fill sizes="360px" className="object-cover" />
          </span>
          <p className="mt-2 text-caption text-muted">
            {selected.width && selected.height ? `${selected.width} × ${selected.height}px` : "Size unknown"}
          </p>
          <fieldset disabled={!canWrite || pending} className="mt-4 space-y-3">
            {(
              [
                ["alt_text", "Alt text (required)"],
                ["title", "Title"],
                ["caption", "Caption"],
                ["credit", "Photo credit"],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="block text-body-sm font-medium">
                {l}
                <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={cn(inputClass, "mt-1")} />
              </label>
            ))}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() =>
                  start(async () => {
                    const r = await updateMediaAction(selected.id, { alt_text: form.alt_text, title: form.title || null, caption: form.caption || null, credit: form.credit || null });
                    setMsg(r.ok ? { ok: true, text: "Image details saved." } : { ok: false, text: r.error });
                    if (r.ok) setItems((prev) => prev.map((i) => (i.id === selected.id ? { ...i, alt: form.alt_text, title: form.title } : i)));
                  })
                }
                className="rounded-xl bg-ink px-4 py-2 text-body-sm font-semibold text-white"
              >
                Save
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm("Remove this image from the library? It disappears wherever it is used.")) return;
                    start(async () => {
                      const r = await deleteMediaAction(selected.id);
                      if (r.ok) {
                        setItems((prev) => prev.filter((i) => i.id !== selected.id));
                        setSelected(null);
                      } else setMsg({ ok: false, text: r.error });
                    });
                  }}
                  className="text-body-sm text-rose-700 underline"
                >
                  Remove
                </button>
              )}
            </div>
          </fieldset>
        </aside>
      )}
    </div>
  );
}
