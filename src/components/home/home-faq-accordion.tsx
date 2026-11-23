"use client";

import { useId, useState } from "react";
import type { FaqItem } from "@/types/content";
import { cn } from "@/lib/cn";

/**
 * FAQ accordion in the homepage card style (WAI-ARIA accordion pattern).
 * Answers are always in the HTML; closed panels are collapsed and `inert`.
 */
export function HomeFaqAccordion({ items }: { items: FaqItem[] }) {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="divide-y divide-gray-100">
      {items.map((item) => {
        const isOpen = openId === item.id;
        const buttonId = `${baseId}-${item.id}-q`;
        const panelId = `${baseId}-${item.id}-a`;
        return (
          <div key={item.id}>
            <h3 className="font-sans">
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="group flex w-full items-start gap-4 py-5 text-left"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full text-[14px] font-bold transition-colors",
                    isOpen ? "bg-brand-pink text-white" : "bg-brand-pink/10 text-brand-pink",
                  )}
                >
                  {isOpen ? "−" : "+"}
                </span>
                <span
                  className={cn(
                    "flex-1 font-display text-[15.5px] font-semibold transition-colors",
                    isOpen ? "text-brand-pink" : "text-brand-navy group-hover:text-brand-pink",
                  )}
                >
                  {item.question}
                </span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  fill="none"
                  className={cn("mt-1 size-4 shrink-0 text-gray-400 transition-transform duration-200", isOpen && "rotate-180")}
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="pb-5 pl-[38px] text-[14.5px] leading-relaxed text-gray-500">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
