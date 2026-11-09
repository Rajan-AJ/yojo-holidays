import "server-only";
import { db } from "@/lib/db";
import { enquiryInput, leadInput } from "@/server/validation/leads";

/**
 * Where trip requests and contact messages enter the database.
 *
 * Input is `unknown` on purpose: callers (server actions, API routes) pass the
 * raw submission and this module validates it. Nothing from the browser is
 * trusted, including any package reference; packages are looked up by their
 * public slugs and must be published.
 *
 * Returns a discriminated result instead of throwing, so forms can show
 * field errors.
 */

export type WriteResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors: Record<string, string[] | undefined> };

export async function createLead(raw: unknown): Promise<WriteResult> {
  const parsed = leadInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { packageRef, ...data } = parsed.data;

  let packageId: string | undefined;
  if (packageRef) {
    const pkg = await db.tourPackage.findFirst({
      where: {
        slug: packageRef.packageSlug,
        status: "PUBLISHED",
        destination: { slug: packageRef.destinationSlug },
      },
      select: { id: true },
    });
    packageId = pkg?.id; // an unknown package doesn't block the lead
  }

  const lead = await db.lead.create({
    data: { ...data, packageId },
    select: { id: true },
  });
  return { ok: true, id: lead.id };
}

export async function createEnquiry(raw: unknown): Promise<WriteResult> {
  const parsed = enquiryInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const enquiry = await db.enquiry.create({ data: parsed.data, select: { id: true } });
  return { ok: true, id: enquiry.id };
}
