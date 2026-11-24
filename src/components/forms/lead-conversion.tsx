"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Fires one `generate_lead` event per reference into the GTM dataLayer.
 * Google Ads and Meta conversion tags are configured in GTM (no code change
 * needed); the reference doubles as a transaction id for de-duplication with
 * server-side uploads (Conversions API / offline conversions) later.
 */
export function LeadConversion({ reference }: { reference: string }) {
  useEffect(() => {
    try {
      const key = `yojo_conv_${reference}`;
      if (sessionStorage.getItem(key)) return; // refresh / back button: don't double count
      sessionStorage.setItem(key, "1");
    } catch {
      // storage unavailable: still send once per page view
    }
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event: "generate_lead", lead_reference: reference });
  }, [reference]);
  return null;
}
