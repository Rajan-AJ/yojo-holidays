/**
 * Rich text is stored as Tiptap / ProseMirror JSON (jsonb). It is rendered by
 * <Prose> as plain React elements: never as raw HTML, so editors cannot inject
 * scripts, and unknown node types are simply skipped.
 */

export type RichTextMark = { type: string; attrs?: Record<string, unknown> };

export type RichTextNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: RichTextMark[];
  content?: RichTextNode[];
};

export type RichTextDoc = { type: "doc"; content?: RichTextNode[] };

export function isRichTextDoc(value: unknown): value is RichTextDoc {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "doc";
}

/** Plain text (meta descriptions, JSON-LD, search snippets). */
export function richTextToPlain(value: RichTextDoc | string | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  const blocks: string[] = [];
  const walk = (node: RichTextNode): string =>
    node.type === "text" ? (node.text ?? "") : node.type === "hardBreak" ? " " : (node.content ?? []).map(walk).join("");
  for (const node of value.content ?? []) {
    const text = walk(node).trim();
    if (text) blocks.push(text);
  }
  return blocks.join("\n\n");
}

/** null for empty documents, so "no description" stays absent in view models. */
export function nonEmptyDoc(value: unknown): RichTextDoc | undefined {
  return isRichTextDoc(value) && richTextToPlain(value).length > 0 ? value : undefined;
}

/** Only these link targets are rendered as links. */
export function safeHref(href: unknown): string | undefined {
  if (typeof href !== "string") return undefined;
  const h = href.trim();
  return /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(h) ? h : undefined;
}
