import { cn } from "@/lib/cn";

/**
 * Plain-text content from the database, split into paragraphs on blank lines.
 * (Rich text / Markdown rendering arrives with the Journal in Phase 9.)
 */
export function Prose({ text, className }: { text?: string; className?: string }) {
  if (!text) return null;
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className={cn("space-y-5 text-body-lg text-muted", className)}>
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
