import type { JsonLdObject } from "./schema";

/**
 * Renders structured data. Pass builders from ./schema; null/empty renders
 * nothing, so pages can pass a builder's result straight through.
 * (Pattern from node_modules/next/dist/docs/01-app/02-guides/json-ld.md.)
 */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] | null }) {
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  const payload = Array.isArray(data)
    ? { "@context": "https://schema.org", "@graph": data }
    : { "@context": "https://schema.org", ...data };

  return (
    <script
      type="application/ld+json"
      // Escape "<" so content can never close the script tag early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload).replace(/</g, "\\u003c") }}
    />
  );
}
