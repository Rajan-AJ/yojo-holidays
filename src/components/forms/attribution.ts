/**
 * Marketing attribution, captured in the browser (first-party, no third-party
 * scripts):
 *
 *   first touch  the visit that first brought this person here (kept 90 days)
 *   last touch   the most recent visit that came from a campaign or another site
 *
 * Each touch holds UTM parameters, Google click ids (gclid / gbraid / wbraid),
 * Meta's fbclid plus its _fbc/_fbp cookies (for the Conversions API later),
 * the landing path and the referrer. Forms send both touches as JSON in a
 * hidden field; the SERVER validates them and decides the channel.
 *
 * Storage failures (private mode, blocked storage) are ignored: attribution is
 * best-effort and must never break a form.
 */

const FIRST_KEY = "yojo_attr_first";
const LAST_KEY = "yojo_attr_last";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gbraid", "wbraid", "fbclid"] as const;

export type Touch = Partial<Record<(typeof PARAMS)[number] | "fbc" | "fbp" | "landing_path" | "referrer" | "at", string>>;

function cookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function read(key: string): (Touch & { at: string }) | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const touch = JSON.parse(raw) as Touch & { at: string };
    return Date.now() - Date.parse(touch.at) < MAX_AGE_MS ? touch : null;
  } catch {
    return null;
  }
}

function write(key: string, touch: Touch) {
  try {
    localStorage.setItem(key, JSON.stringify(touch));
  } catch {
    // storage unavailable: ignore
  }
}

/** Call once per page view (see <AttributionCapture />). */
export function captureAttribution() {
  const url = new URL(window.location.href);
  const touch: Touch = { landing_path: url.pathname, at: new Date().toISOString() };
  let hasCampaign = false;
  for (const p of PARAMS) {
    const value = url.searchParams.get(p);
    if (value) {
      touch[p] = value.slice(0, 500);
      hasCampaign = true;
    }
  }
  const referrer = document.referrer;
  const external = referrer && !referrer.startsWith(window.location.origin);
  if (external) touch.referrer = referrer.slice(0, 2000);

  if (!read(FIRST_KEY)) write(FIRST_KEY, touch);
  // A new campaign click or an arrival from another site replaces the last touch.
  if (hasCampaign || external || !read(LAST_KEY)) write(LAST_KEY, touch);
}

/** JSON for the form's hidden `attribution` field. */
export function attributionPayload(): string {
  const fbc = cookie("_fbc");
  const fbp = cookie("_fbp");
  const withMeta = (t: Touch | null) => (t ? { ...t, ...(fbc && { fbc }), ...(fbp && { fbp }) } : undefined);
  return JSON.stringify({ first: withMeta(read(FIRST_KEY)), last: withMeta(read(LAST_KEY)) });
}
