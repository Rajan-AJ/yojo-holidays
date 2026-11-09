"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { mainNav, primaryCta, siteConfig } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "./wordmark";

/**
 * Full-screen mobile navigation built on a native modal <dialog>:
 * focus is trapped inside, Esc closes it, the page behind is inert, and focus
 * returns to the menu button on close. Background scrolling is locked by
 * `html:has(dialog[open])` in globals.css. The slide-down is CSS only.
 */
export function MobileMenu({ pathname }: { pathname: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  // Close on navigation (routes can stay mounted with Cache Components).
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  // The dialog is hidden from lg up; close it if the viewport grows while it
  // is open, otherwise the page would stay inert behind an invisible modal.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) dialogRef.current?.close();
    };
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <button
        type="button"
        className="-mr-2.5 inline-flex size-11 items-center justify-center lg:hidden"
        aria-haspopup="dialog"
        aria-controls="mobile-menu"
        onClick={() => dialogRef.current?.showModal()}
      >
        <span className="sr-only">Open menu</span>
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 8h18M3 16h18" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <dialog
        id="mobile-menu"
        ref={dialogRef}
        aria-label="Menu"
        className="mobile-menu m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-canvas text-ink backdrop:bg-transparent lg:hidden"
      >
        <div className="flex min-h-full flex-col">
          <div className="flex h-header shrink-0 items-center justify-between px-gutter">
            <Wordmark />
            <button
              type="button"
              className="-mr-2.5 inline-flex size-11 items-center justify-center"
              onClick={close}
            >
              <span className="sr-only">Close menu</span>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 3l14 14M17 3L3 17" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>

          <nav aria-label="Mobile" className="flex flex-1 flex-col px-gutter pb-10 pt-6">
            <ul className="border-t border-line">
              {mainNav.map((item) => (
                <li key={item.href} className="border-b border-line">
                  <Link
                    href={item.href}
                    onClick={close}
                    aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                    className="flex items-center justify-between py-4 font-serif text-h3 aria-[current=page]:text-accent-strong"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-10">
              <ButtonLink href={primaryCta.href} onClick={close} size="lg" className="w-full">
                {primaryCta.label}
              </ButtonLink>
              <p className="caption mt-6 text-center text-muted">{siteConfig.tagline}</p>
            </div>
          </nav>
        </div>
      </dialog>
    </>
  );
}
