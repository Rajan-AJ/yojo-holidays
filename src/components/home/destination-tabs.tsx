"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type Tab = { id: string; label: string; panel: React.ReactNode };

/**
 * WAI-ARIA tabs. Every panel is server-rendered into the HTML (crawlable);
 * inactive ones are hidden. Arrow keys move between tabs. The tab list sits
 * beside `header` (e.g. the section heading).
 */
export function Tabs({
  tabs,
  label,
  header,
}: {
  tabs: Tab[];
  label: string;
  /** Rendered to the left of the tab list (e.g. the section heading). */
  header?: React.ReactNode;
}) {
  const baseId = useId();
  const [active, setActive] = useState(tabs[0]?.id);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + tabs.length) % tabs.length;
    setActive(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <>
      <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        {header}
        {tabs.length > 1 && (
          <div
            role="tablist"
            aria-label={label}
            className="flex shrink-0 items-center self-start rounded-xl border border-gray-200 bg-white p-1 shadow-sm sm:self-auto"
          >
            {tabs.map((tab, index) => {
              const selected = tab.id === active;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    refs.current[index] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-${tab.id}-tab`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-${tab.id}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(tab.id)}
                  onKeyDown={(e) => onKeyDown(e, index)}
                  className={cn(
                    "h-10 rounded-lg px-5 text-[13.5px] font-semibold transition-all duration-200",
                    selected ? "bg-brand-pink text-white shadow-sm" : "text-gray-500 hover:text-brand-navy",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role={tabs.length > 1 ? "tabpanel" : undefined}
          id={`${baseId}-${tab.id}-panel`}
          aria-labelledby={tabs.length > 1 ? `${baseId}-${tab.id}-tab` : undefined}
          hidden={tab.id !== active}
        >
          {tab.panel}
        </div>
      ))}
    </>
  );
}
