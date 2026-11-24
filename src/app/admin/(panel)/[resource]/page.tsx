import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getResource } from "@/server/admin/resources";
import { listRecords, PAGE_SIZE } from "@/server/admin/crud";
import { requireStaff } from "@/server/admin/session";
import { mediaUrl } from "@/lib/media";
import { formatPrice } from "@/lib/format";
import { AdminPage, Badge, EmptyState, PageHeader, adminButton, formatAdminDate } from "@/components/admin/ui";
import { EditView } from "@/components/admin/edit-view";
import { cn } from "@/lib/cn";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ResourceListPage({ params, searchParams }: PageProps<"/admin/[resource]">) {
  const res = getResource((await params).resource);
  if (!res) notFound();
  const session = await requireStaff();
  if (!session.can(res.permission, "read")) notFound();
  if (res.singleton) return <EditView res={res} id={null} session={session} />;

  const sp = await searchParams;
  const q = first(sp.q)?.slice(0, 100) ?? "";
  const status = ["draft", "published", "unpublished", "archived"].includes(first(sp.status) ?? "") ? first(sp.status) : undefined;
  const trash = first(sp.trash) === "1";
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const { rows, total, statusCounts } = await listRecords(res, { q, status, trash, page });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = `/admin/${res.key}/`;
  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ q: q || undefined, status, trash: trash ? "1" : undefined, ...extra }).filter((e): e is [string, string] => Boolean(e[1])));
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };
  const allCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <AdminPage>
      <PageHeader
        title={res.plural}
        eyebrow={res.group}
        description={trash ? "Items in the trash are hidden from the website. Restore them or delete them permanently." : undefined}
        actions={
          session.can(res.permission, "write") && !trash && (
            <Link href={`${base}new/`} className={adminButton.primary}>
              + New {res.singular.toLowerCase()}
            </Link>
          )
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {res.publishable && !trash ? (
          <nav aria-label="Filter by status" className="flex flex-wrap gap-1.5">
            {[
              [undefined, "All", allCount],
              ["published", "Published", statusCounts.published ?? 0],
              ["draft", "Draft", statusCounts.draft ?? 0],
              ["unpublished", "Unpublished", statusCounts.unpublished ?? 0],
              ["archived", "Archived", statusCounts.archived ?? 0],
            ].map(([value, label, count]) => (
              <Link
                key={String(label)}
                href={qs({ status: value as string | undefined, page: undefined })}
                aria-current={status === value ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-body-sm transition-colors",
                  status === value ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink",
                )}
              >
                {label} <span className="opacity-60">{count}</span>
              </Link>
            ))}
          </nav>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <form action={base} className="flex items-center gap-2">
            {status && <input type="hidden" name="status" value={status} />}
            {trash && <input type="hidden" name="trash" value="1" />}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={`Search ${res.plural.toLowerCase()}…`}
              className="min-h-10 w-64 rounded-xl border border-line-strong bg-white px-3.5 text-body-sm"
            />
          </form>
          {res.softDelete && (
            <Link href={trash ? base : `${base}?trash=1`} className={adminButton.ghost}>
              {trash ? "← Back" : "Trash"}
            </Link>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={q ? "Nothing matches your search" : trash ? "The trash is empty" : `No ${res.plural.toLowerCase()} yet`}>
          {!q && !trash && session.can(res.permission, "write") && (
            <Link href={`${base}new/`} className="font-medium text-ink underline">
              Create the first one
            </Link>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-left text-body-sm">
            <thead className="border-b border-line bg-[#fafaf8] text-caption uppercase tracking-wide text-muted">
              <tr>
                {res.list.map((c, i) => (
                  <th key={i} scope="col" className={cn("px-4 py-3 font-semibold", c.kind === "image" && "w-16")}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={String(row.id)} className="group hover:bg-[#fbfaf7]">
                  {res.list.map((c, i) => {
                    const v = row[`c${i}`];
                    const isTitle = i === res.list.findIndex((x) => x.kind !== "image");
                    let content: React.ReactNode;
                    if (c.kind === "image") {
                      const m = v as { bucket: string; path: string } | null;
                      content = m ? (
                        <span className="relative block size-10 overflow-hidden rounded-lg bg-sand">
                          <Image src={mediaUrl(m.bucket, m.path)} alt="" fill sizes="40px" className="object-cover" />
                        </span>
                      ) : (
                        <span className="block size-10 rounded-lg bg-sand" />
                      );
                    } else if (c.kind === "status") {
                      content = <Badge tone={String(v)}>{String(v)}</Badge>;
                    } else if (c.kind === "date") {
                      content = <span className="text-muted">{formatAdminDate(v)}</span>;
                    } else if (c.kind === "boolean") {
                      content = v ? "Yes" : <span className="text-muted">No</span>;
                    } else if (c.kind === "money") {
                      content = typeof v === "number" ? formatPrice(v, "INR") : <span className="text-muted">On request</span>;
                    } else {
                      content = v == null || v === "" ? <span className="text-muted">—</span> : String(v);
                    }
                    return (
                      <td key={i} className={cn("px-4 py-3", isTitle && "font-medium text-ink")}>
                        {isTitle ? (
                          <Link href={`${base}${row.id}/`} className="hover:underline">
                            {content}
                          </Link>
                        ) : (
                          content
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between text-body-sm text-muted">
          <span>
            {total} {res.plural.toLowerCase()} · page {page} of {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={qs({ page: String(page - 1) })} className={adminButton.secondary}>
                Previous
              </Link>
            )}
            {page < pages && (
              <Link href={qs({ page: String(page + 1) })} className={adminButton.secondary}>
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </AdminPage>
  );
}

// Per-request admin page (reads the signed-in user): render on the server, no instant-navigation prerender.
export const instant = false;
