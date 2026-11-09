/** ₹45,000 (Indian digit grouping for INR, no decimals). */
export function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "6 days / 5 nights" */
export function formatDuration(days: number, nights: number) {
  const d = `${days} ${days === 1 ? "day" : "days"}`;
  const n = `${nights} ${nights === 1 ? "night" : "nights"}`;
  return `${d} / ${n}`;
}

/** "12 March 2026" from an ISO date. Fixed locale + UTC so server and client agree. */
export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** "01" */
export function padNumber(n: number) {
  return String(n).padStart(2, "0");
}
