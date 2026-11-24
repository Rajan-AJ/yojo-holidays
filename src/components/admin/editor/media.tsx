"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { getMediaAction, listMediaAction, uploadMediaAction, type MediaItem } from "@/app/admin/actions";
import { cn } from "@/lib/cn";

/** Reads width/height in the browser so pages can reserve space (no layout shift). */
async function imageSize(file: File): Promise<{ width?: number; height?: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return {};
  }
}

export async function uploadFile(file: File, alt: string, folder = "general") {
  const { width, height } = await imageSize(file);
  const fd = new FormData();
  fd.set("file", file);
  fd.set("alt", alt);
  fd.set("folder", folder);
  if (width) fd.set("width", String(width));
  if (height) fd.set("height", String(height));
  return uploadMediaAction(fd);
}

// Cache of id -> item so thumbnails render without refetching.
const known = new Map<string, MediaItem>();

function useMediaItem(id: string | null) {
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (!id || known.has(id)) return;
    let alive = true;
    getMediaAction([id]).then((items) => {
      items.forEach((i) => known.set(i.id, i));
      if (alive) setVersion((v) => v + 1);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return id ? (known.get(id) ?? null) : null;
}

function Thumb({ item, className }: { item: MediaItem | null; className?: string }) {
  return (
    <span className={cn("relative block overflow-hidden rounded-lg bg-[#efece5]", className)}>
      {item && <Image src={item.src} alt={item.alt} fill sizes="200px" className="object-cover" />}
    </span>
  );
}

export function MediaInput({ value, onChange, disabled }: { value: string | null; onChange: (v: unknown) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const item = useMediaItem(value);
  return (
    <div className="flex items-center gap-4">
      <Thumb item={item} className="h-20 w-28 shrink-0" />
      <div className="min-w-0 space-y-1.5">
        {item && <p className="truncate text-caption text-muted">{item.alt || <em>No alt text: add it in the Media library</em>}</p>}
        <div className="flex gap-2">
          <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="rounded-lg border border-line-strong bg-white px-3 py-1.5 text-caption font-semibold hover:border-ink">
            {value ? "Change" : "Choose image"}
          </button>
          {value && (
            <button type="button" disabled={disabled} onClick={() => onChange(null)} className="rounded-lg px-2 py-1.5 text-caption text-muted hover:text-rose-700">
              Remove
            </button>
          )}
        </div>
      </div>
      {open && (
        <MediaPicker
          onClose={() => setOpen(false)}
          onPick={(picked) => {
            known.set(picked.id, picked);
            onChange(picked.id);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

export function GalleryInput({ value, onChange, disabled }: { value: string[]; onChange: (v: unknown) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <ul className="flex flex-wrap gap-3">
        {value.map((id, i) => (
          <GalleryThumb
            key={id}
            id={id}
            onRemove={() => onChange(value.filter((x) => x !== id))}
            onLeft={i > 0 ? () => onChange(value.map((v, n) => (n === i - 1 ? id : n === i ? value[i - 1] : v))) : undefined}
            disabled={disabled}
          />
        ))}
        <li>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen(true)}
            className="flex h-20 w-28 items-center justify-center rounded-lg border border-dashed border-line-strong text-caption font-semibold text-muted hover:border-ink hover:text-ink"
          >
            + Add
          </button>
        </li>
      </ul>
      {open && (
        <MediaPicker
          onClose={() => setOpen(false)}
          onPick={(picked) => {
            known.set(picked.id, picked);
            if (!value.includes(picked.id)) onChange([...value, picked.id]);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function GalleryThumb({ id, onRemove, onLeft, disabled }: { id: string; onRemove: () => void; onLeft?: () => void; disabled?: boolean }) {
  const item = useMediaItem(id);
  return (
    <li className="group relative">
      <Thumb item={item} className="h-20 w-28" />
      <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {onLeft ? (
          <button type="button" disabled={disabled} onClick={onLeft} className="rounded bg-white/90 px-1.5 text-caption" aria-label="Move left">
            ←
          </button>
        ) : (
          <span />
        )}
        <button type="button" disabled={disabled} onClick={onRemove} className="rounded bg-white/90 px-1.5 text-caption text-rose-700" aria-label="Remove image">
          ✕
        </button>
      </div>
    </li>
  );
}

/** Modal: browse the library or upload a new image. */
export function MediaPicker({ onPick, onClose }: { onPick: (item: MediaItem) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [pending, start] = useTransition();

  const load = useCallback((q: string, p: number) => {
    start(async () => {
      const res = await listMediaAction(q, p);
      res.items.forEach((i) => known.set(i.id, i));
      setItems((prev) => (p === 1 ? res.items : [...prev, ...res.items]));
      setMore(res.more);
    });
  }, []);

  useEffect(() => {
    dialog.current?.showModal();
    load("", 1);
  }, [load]);

  const upload = (file: File) => {
    setError(null);
    if (!alt.trim()) {
      setError("Describe the image first (alt text). It helps SEO and screen-reader users.");
      return;
    }
    start(async () => {
      const res = await uploadFile(file, alt.trim());
      if (!res.ok) setError(res.error);
      else onPick(res.item);
    });
  };

  return (
    <dialog ref={dialog} onClose={onClose} className="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-black/40">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="font-semibold">Choose an image</h2>
        <button type="button" onClick={() => dialog.current?.close()} className="text-muted hover:text-ink" aria-label="Close">
          ✕
        </button>
      </div>
      <div className="space-y-5 p-6">
        <div className="rounded-xl bg-[#f7f5f0] p-4">
          <p className="text-body-sm font-semibold">Upload new</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Alt text: what's in the photo? e.g. Houseboat on Alleppey backwaters at sunset"
              maxLength={300}
              className="min-h-10 min-w-0 flex-1 rounded-xl border border-line-strong bg-white px-3 text-body-sm"
            />
            <label className="inline-flex min-h-10 cursor-pointer items-center rounded-xl bg-ink px-4 text-body-sm font-semibold text-white">
              {pending ? "Uploading…" : "Select file"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <p className="mt-2 text-caption text-muted">JPG, PNG, WebP or AVIF, up to 10 MB. Use landscape photos at least 2000px wide for heroes.</p>
          {error && <p className="mt-2 text-caption font-medium text-rose-700">{error}</p>}
        </div>

        <div>
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              load(e.target.value, 1);
            }}
            placeholder="Search the library…"
            className="min-h-10 w-full rounded-xl border border-line-strong px-3 text-body-sm"
          />
          <ul className="mt-4 grid max-h-[50vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-5">
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => onPick(item)} className="group block w-full text-left">
                  <Thumb item={item} className="aspect-[4/3] w-full ring-ink group-hover:ring-2" />
                  <span className="mt-1 block truncate text-caption text-muted">{item.alt || item.title}</span>
                </button>
              </li>
            ))}
          </ul>
          {items.length === 0 && !pending && <p className="py-8 text-center text-body-sm text-muted">No images yet. Upload the first one above.</p>}
          {more && (
            <button
              type="button"
              onClick={() => {
                setPage(page + 1);
                load(search, page + 1);
              }}
              className="mt-4 text-body-sm font-medium underline"
            >
              Load more
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
