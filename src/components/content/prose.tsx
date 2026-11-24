import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { isRichTextDoc, safeHref, type RichTextDoc, type RichTextNode } from "@/lib/rich-text";

/**
 * Database text. Accepts either plain text (split into paragraphs on blank
 * lines) or a rich-text document (Tiptap JSON, see src/lib/rich-text.ts).
 */
export function Prose({ text, className }: { text?: string | RichTextDoc; className?: string }) {
  if (!text) return null;

  if (isRichTextDoc(text)) {
    return (
      <div className={cn("prose-yojo space-y-5 text-body-lg text-muted", className)}>
        {(text.content ?? []).map((node, i) => renderBlock(node, i))}
      </div>
    );
  }

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

function renderInline(nodes: RichTextNode[] | undefined): ReactNode[] {
  return (nodes ?? []).map((node, i) => {
    if (node.type === "hardBreak") return <br key={i} />;
    if (node.type !== "text" || !node.text) return null;
    let el: ReactNode = node.text;
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") el = <strong className="font-semibold text-ink">{el}</strong>;
      else if (mark.type === "italic") el = <em>{el}</em>;
      else if (mark.type === "code") el = <code className="rounded bg-sand px-1 text-body-sm">{el}</code>;
      else if (mark.type === "link") {
        const href = safeHref(mark.attrs?.href);
        if (href) {
          const external = /^https?:\/\//i.test(href);
          el = (
            <a
              href={href}
              className="font-medium text-ink underline decoration-accent/60 underline-offset-4 hover:decoration-accent"
              {...(external && { rel: "noopener noreferrer", target: "_blank" })}
            >
              {el}
            </a>
          );
        }
      }
    }
    return <span key={i}>{el}</span>;
  });
}

function renderBlock(node: RichTextNode, key: number): ReactNode {
  switch (node.type) {
    case "paragraph":
      return node.content?.length ? <p key={key}>{renderInline(node.content)}</p> : null;
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      const cls = "font-display text-ink";
      if (level <= 2) return <h2 key={key} className={cn(cls, "pt-4 text-h3")}>{renderInline(node.content)}</h2>;
      if (level === 3) return <h3 key={key} className={cn(cls, "pt-2 text-h4")}>{renderInline(node.content)}</h3>;
      return <h4 key={key} className={cn(cls, "text-body-lg font-semibold")}>{renderInline(node.content)}</h4>;
    }
    case "bulletList":
      return (
        <ul key={key} className="list-disc space-y-2 pl-6 marker:text-accent">
          {(node.content ?? []).map((li, i) => (
            <li key={i}>{(li.content ?? []).map((c, j) => (c.type === "paragraph" ? <span key={j}>{renderInline(c.content)}</span> : renderBlock(c, j)))}</li>
          ))}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="list-decimal space-y-2 pl-6 marker:text-accent">
          {(node.content ?? []).map((li, i) => (
            <li key={i}>{(li.content ?? []).map((c, j) => (c.type === "paragraph" ? <span key={j}>{renderInline(c.content)}</span> : renderBlock(c, j)))}</li>
          ))}
        </ol>
      );
    case "blockquote":
      return (
        <blockquote key={key} className="border-l-2 border-accent pl-6 font-display text-h4 italic text-ink">
          {(node.content ?? []).map((c, i) => renderBlock(c, i))}
        </blockquote>
      );
    case "horizontalRule":
      return <hr key={key} className="border-line" />;
    default:
      return null;
  }
}
