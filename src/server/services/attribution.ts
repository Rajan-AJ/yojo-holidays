import "server-only";
import type { TouchInput } from "@/server/validation/leads";

/**
 * Maps one attribution touch to a marketing channel code
 * (public.marketing_channels.code). Order matters: paid signals win.
 *
 * Kept on the server so the rules can change without trusting the browser,
 * and so every lead is classified the same way.
 */
export type ChannelCode =
  | "google-ads"
  | "meta-ads"
  | "organic-search"
  | "instagram"
  | "facebook"
  | "youtube"
  | "whatsapp"
  | "email"
  | "referral"
  | "direct"
  | "other";

const PAID_MEDIUM = /^(cpc|ppc|paid|paidsearch|paid_search|paid-social|paid_social|paidsocial|cpm|display|ads?)$/i;
const SEARCH_ENGINES = /(^|\.)(google|bing|yahoo|duckduckgo|ecosia|yandex|baidu)\./i;

function host(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function classifyChannel(touch: TouchInput | undefined, ownHost?: string): ChannelCode {
  if (!touch) return "direct";
  const source = (touch.utm_source ?? "").toLowerCase();
  const medium = (touch.utm_medium ?? "").toLowerCase();
  const ref = host(touch.referrer);
  const paid = PAID_MEDIUM.test(medium);

  if (touch.gclid || touch.gbraid || touch.wbraid) return "google-ads";
  if (paid && /google|adwords/.test(source)) return "google-ads";
  if (paid && /facebook|fb|instagram|ig|meta/.test(source)) return "meta-ads";

  if (/whatsapp|wa$/.test(source) || /(^|\.)(wa\.me|whatsapp\.com)$/.test(ref)) return "whatsapp";
  if (/instagram|^ig$/.test(source) || /instagram\.com$/.test(ref)) return "instagram";
  if (/facebook|^fb$/.test(source) || touch.fbclid || /(facebook\.com|fb\.me)$/.test(ref)) return "facebook";
  if (/youtube|^yt$/.test(source) || /(youtube\.com|youtu\.be)$/.test(ref)) return "youtube";
  if (medium === "email" || /newsletter|mailchimp|email/.test(source)) return "email";

  if (medium === "organic" || SEARCH_ENGINES.test(`${ref}.`)) return "organic-search";
  if (source && !paid) return medium === "referral" ? "referral" : "other";
  if (paid) return "other";

  if (ref && ref !== ownHost && !ref.endsWith(`.${ownHost}`)) return "referral";
  return "direct";
}

export function deviceType(userAgent?: string | null): "mobile" | "tablet" | "desktop" | "other" {
  if (!userAgent) return "other";
  if (/ipad|tablet|(android(?!.*mobile))/i.test(userAgent)) return "tablet";
  if (/mobi|iphone|android/i.test(userAgent)) return "mobile";
  if (/windows|macintosh|linux|cros/i.test(userAgent)) return "desktop";
  return "other";
}
