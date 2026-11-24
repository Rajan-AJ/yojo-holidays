import { notFound } from "next/navigation";
import type { ResourceDef } from "@/server/admin/resources";
import type { StaffSession } from "@/server/admin/session";
import { loadRecord, loadRelationOptions } from "@/server/admin/crud";
import { emptyValues, type EditorConfig } from "@/lib/admin/fields";
import { AdminPage } from "@/components/admin/ui";
import { RecordEditor } from "@/components/admin/editor/record-editor";

/** Server part of the editor: loads the record + option lists, decides permissions. */
export async function EditView({ res, id, session }: { res: ResourceDef; id: string | null; session: StaffSession }) {
  const isNew = !res.singleton && id === null;
  const record = isNew ? null : await loadRecord(res, id);
  if (!isNew && !record) notFound();

  const allFields = [...res.fields, ...(res.side ?? [])];
  const options = await loadRelationOptions(allFields);
  const values = record?.values ?? {
    ...emptyValues(allFields),
    ...(res.publishable && { status: "draft", published_at: null }),
    ...(res.seo && { __seo: {} }),
  };

  const config: EditorConfig = {
    key: res.key,
    singular: res.singular,
    fields: res.fields,
    side: res.side ?? [],
    publishable: Boolean(res.publishable),
    seo: Boolean(res.seo),
    softDelete: Boolean(res.softDelete),
    publicPrefix: res.publicPrefix,
    canWrite: session.can(res.permission, "write"),
    canPublish: session.can(res.permission, "publish"),
    canDelete: session.can(res.permission, res.softDelete ? "delete" : "write"),
    canSeo: session.can("seo", "write"),
    singleton: Boolean(res.singleton),
    titleField: res.titleColumn,
  };

  return (
    <AdminPage>
      <RecordEditor
        config={config}
        recordId={record?.id ?? null}
        initial={values}
        options={options}
        title={record?.title || `New ${res.singular.toLowerCase()}`}
        slug={record?.slug}
        deletedAt={record?.deletedAt ?? null}
        backHref={res.singleton ? "/admin/" : `/admin/${res.key}/`}
        backLabel={res.singleton ? "Dashboard" : res.plural}
      />
    </AdminPage>
  );
}
