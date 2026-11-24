import { notFound } from "next/navigation";
import { getResource } from "@/server/admin/resources";
import { requireStaff } from "@/server/admin/session";
import { EditView } from "@/components/admin/edit-view";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// /admin/{resource}/new/ creates; /admin/{resource}/{uuid}/ edits.
export default async function ResourceEditPage({ params }: PageProps<"/admin/[resource]/[id]">) {
  const { resource, id } = await params;
  const res = getResource(resource);
  if (!res || res.singleton) notFound();
  const session = await requireStaff();
  if (!session.can(res.permission, "read")) notFound();
  if (id === "new") {
    if (!session.can(res.permission, "write")) notFound();
    return <EditView res={res} id={null} session={session} />;
  }
  if (!UUID.test(id)) notFound();
  return <EditView res={res} id={id} session={session} />;
}
