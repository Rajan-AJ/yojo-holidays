"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@/lib/cn";
import { isRichTextDoc } from "@/lib/rich-text";

/**
 * Rich text for non-technical editors: headings, bold, italic, lists, quotes
 * and links. Saved as Tiptap JSON (rendered safely by <Prose> on the site).
 * No raw HTML, no images inline (photos go in image fields / galleries).
 */
export function RichTextInput({
  value,
  onChange,
  disabled,
  invalid,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, protocols: ["https", "mailto", "tel"] },
      }),
    ],
    content: isRichTextDoc(value) ? value : "",
    editorProps: {
      attributes: {
        class: "prose-admin min-h-40 px-4 py-3 text-body-sm leading-relaxed focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? null : e.getJSON()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
          }
        : null,
  });

  const btn = (active: boolean | undefined) =>
    cn("min-h-8 rounded-md px-2.5 text-caption font-semibold", active ? "bg-ink text-white" : "text-muted hover:bg-black/5 hover:text-ink");

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link (https://… or /page/)", previous ?? "https://");
    if (url === null) return;
    if (url === "") editor.chain().focus().unsetLink().run();
    else if (/^(https?:\/\/|mailto:|tel:|\/)/.test(url)) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-white", invalid ? "border-rose-400" : "border-line-strong", "focus-within:border-ink")}>
      <div className="flex flex-wrap gap-0.5 border-b border-line bg-[#fafaf8] px-1.5 py-1" role="toolbar" aria-label="Formatting">
        <button type="button" className={btn(state?.h2)} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </button>
        <button type="button" className={btn(state?.h3)} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </button>
        <span className="mx-1 w-px bg-line" />
        <button type="button" className={btn(state?.bold)} onClick={() => editor?.chain().focus().toggleBold().run()}>
          B
        </button>
        <button type="button" className={cn(btn(state?.italic), "italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          I
        </button>
        <button type="button" className={btn(state?.link)} onClick={setLink}>
          Link
        </button>
        <span className="mx-1 w-px bg-line" />
        <button type="button" className={btn(state?.bullet)} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          • List
        </button>
        <button type="button" className={btn(state?.ordered)} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          1. List
        </button>
        <button type="button" className={btn(state?.quote)} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
          Quote
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
