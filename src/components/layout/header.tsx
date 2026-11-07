"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mainNav, primaryCta } from "@/config/site";
import { cn } from "@/lib/cn";
import { buttonClasses } from "@/components/ui/button-link";
import { Wordmark } from "./wordmark";

/** Pages whose first section is a full-bleed hero the header can float over. */
const OVERLAY_ROUTES = new Set(["/"]);

export function Header() {
  const pathname = usePathname();
  const canOverlay = OVERLAY_ROUTES.has(pathname);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // With Cache Components, routes stay mounted (hidden) after navigation,
  // so explicitly close the menu whenever the path changes.
  useEffect(() => {
    menuRef.current?.close();
  }, [pathname]);

  const transparent = canOverlay && !scrolled;

  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] rounded bg-ink px-4 py-2 text-canvas focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,color,border-color] duration-500 ease-(--ease-editorial)",
          transparent
            ? "border-b border-transparent bg-transparent text-white"
            : "border-b border-line bg-canvas/95 text-ink backdrop-blur-md",
        )}
      >
        <div className="mx-auto flex h-(--spacing-header) w-full max-w-(--container-site) items-center justify-between gap-6 px-5 sm:px-8 lg:px-12">
          <Wordmark />

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {mainNav.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "text-sm tracking-wide transition-opacity hover:opacity-100",
                        active ? "opacity-100" : "opacity-75",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={primaryCta.href}
              className={cn(
                buttonClasses(transparent ? "ghost-light" : "primary"),
                "hidden min-h-10 sm:inline-flex",
              )}
            >
              {primaryCta.label}
            </Link>

            <button
              type="button"
              className="-mr-2 inline-flex size-11 items-center justify-center lg:hidden"
              aria-haspopup="dialog"
              aria-controls="mobile-menu"
              onClick={() => menuRef.current?.showModal()}
            >
              <span className="sr-only">Open menu</span>
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M2 7h18M2 15h18" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Native <dialog> gives focus trapping, Esc to close and inert background for free. */}
      <dialog
        id="mobile-menu"
        ref={menuRef}
        aria-label="Menu"
        className="m-0 h-dvh max-h-none w-full max-w-none bg-canvas text-ink backdrop:bg-ink/40 lg:hidden"
      >
        <div className="flex h-(--spacing-header) items-center justify-between px-5 sm:px-8">
          <Wordmark />
          <button
            type="button"
            className="-mr-2 inline-flex size-11 items-center justify-center"
            onClick={() => menuRef.current?.close()}
          >
            <span className="sr-only">Close menu</span>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 3l14 14M17 3L3 17" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        <nav aria-label="Mobile" className="px-5 pt-8 sm:px-8">
          <ul className="divide-y divide-line border-y border-line">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => menuRef.current?.close()}
                  className="block py-5 font-serif text-3xl"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={primaryCta.href}
            onClick={() => menuRef.current?.close()}
            className={cn(buttonClasses("primary"), "mt-10 w-full")}
          >
            {primaryCta.label}
          </Link>
        </nav>
      </dialog>
    </>
  );
}
