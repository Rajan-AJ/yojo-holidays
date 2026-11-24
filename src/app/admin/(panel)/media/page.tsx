import { notFound } from "next/navigation";
import { requireStaff } from "@/server/admin/session";
import { AdminPage, PageHeader } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/media-library";

export default async function MediaPage() {
  const session = await requireStaff();
  if (!session.can("media", "read")) notFound();
  return (
    <AdminPage>
      <PageHeader
        title="Media library"
        eyebrow="Content"
        description="Every image on the website. Alt text is required: it's read by screen readers and helps Google understand the photo."
      />
      <MediaLibrary canWrite={session.can("media", "write")} canDelete={session.can("media", "delete")} />
    </AdminPage>
  );
}

// Per-request admin page (reads the signed-in user): render on the server, no instant-navigation prerender.
export const instant = false;
