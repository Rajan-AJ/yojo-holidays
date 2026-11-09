"use client";

import { useId, useState } from "react";
import type { FaqItem } from "@/types/content";
import { cn } from "@/lib/cn";

/**
 * Accessible FAQ accordion (WAI-ARIA accordion pattern).
 *
 * - Each question is an <h3> containing a real <button> with aria-expanded.
 * - Answers are always rendered into the HTML, so search engines and answer
 *   engines can read them; closed panels are only visually collapsed (and
 *   `inert`, so they are skipped by keyboard and screen readers).
 * - The open/close animation is a CSS grid-row transition, which the global
 *   reduced-motion rule switches off.
 */
export function FaqAccordion({
  items,
  defaultOpenId,
  allowMultiple = false,
  className,
}: {
  items: FaqItem[];
  defaultOpenId?: string;
  allowMultiple?: boolean;
  className?: string;
}) {
  const baseId = useId();
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(defaultOpenId ? [defaultOpenId] : []),
  );

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(allowMultiple ? current : []);
      if (!current.has(id)) next.add(id);
      return next;
    });

  return (
    <div className={cn("border-t border-line", className)}>
      {items.map((item) => {
        const isOpen = open.has(item.id);
        const buttonId = `${baseId}-${item.id}-q`;
        const panelId = `${baseId}-${item.id}-a`;

        return (
          <div key={item.id} className="border-b border-line">
            <h3 className="font-sans text-body-lg">
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="group flex w-full items-start justify-between gap-6 py-6 text-left"
              >
                <span className="font-medium transition-colors group-hover:text-accent-strong">
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className="relative mt-1.5 size-4 shrink-0 text-muted group-hover:text-ink"
                >
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
                  <span
                    className={cn(
                      "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current transition-transform duration-(--duration-base) ease-(--ease-editorial)",
                      isOpen && "scale-y-0",
                    )}
                  />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-(--duration-base) ease-(--ease-editorial)",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl pb-7 pr-10 text-body text-muted">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
