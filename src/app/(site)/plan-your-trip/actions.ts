"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createLead } from "@/server/services/leads";
import { routes } from "@/lib/routes";
import { siteConfig } from "@/config/site";

export type EnquiryState = {
  fieldErrors?: Record<string, string[] | undefined>;
  formError?: string;
};

/**
 * Public enquiry submission. Everything is validated in createLead(); this
 * action only adds request context (user agent for device type, our own host
 * so internal referrers aren't counted as referrals) and redirects to the
 * thank-you page, where conversion tracking fires.
 */
export async function submitEnquiry(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  const h = await headers();
  let reference: string;
  try {
    const result = await createLead(Object.fromEntries(formData), {
      userAgent: h.get("user-agent"),
      siteHost: new URL(siteConfig.url).hostname,
    });
    if (!result.ok) return { fieldErrors: result.fieldErrors };
    reference = result.reference;
  } catch (error) {
    console.error("[enquiry] failed to save", error);
    return { formError: "Sorry, we couldn't send your enquiry just now. Please try again, or message us on WhatsApp." };
  }
  redirect(routes.thankYou(reference));
}
