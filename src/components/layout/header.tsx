"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { mainNav, primaryCta } from "@/config/site";
import { cn } from "@/lib/cn";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "./wordmark";
import { MobileMenu } from "./mobile-menu";

/** Pages whose first section is a full-bleed hero the header can float over. */
const OVERLAY_ROUTES = new Set(["/"]);

/** Distance scrolled before the header turns solid. */
const SOLID_AFTER_PX = 32;

export function Header() {
  const pathname = usePathname();
  const canOverlay = OVERLAY_ROUTES.has(pathname);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SOLID_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const transparent = canOverlay && !scrolled;

  return (
    <>
      <a
        href="#main"
        className="sr-only z-60 rounded-card bg-ink px-4 py-2 text-canvas focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,color,box-shadow] duration-(--duration-slow) ease-(--ease-editorial)",
          transparent
            ? "on-dark bg-transparent text-white"
            : "bg-canvas/95 text-ink shadow-header backdrop-blur-md",
        )}
      >
        {/* Soft top shade so white text stays legible over bright sky in the hero. */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-linear-to-b from-ink/35 to-transparent transition-opacity duration-(--duration-slow)",
            transparent ? "opacity-100" : "opacity-0",
          )}
        />
        <div className="mx-auto flex h-header w-full max-w-wide items-center justify-between gap-6 px-gutter">
          <Wordmark />

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-6 xl:gap-9">
              {mainNav.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative py-2 text-nav transition-opacity duration-(--duration-base) hover:opacity-100",
                        "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-current after:transition-transform after:duration-(--duration-base) after:ease-(--ease-editorial)",
                        active
                          ? "opacity-100 after:scale-x-100"
                          : "opacity-80 after:scale-x-0 hover:after:scale-x-100",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            {/* Wrapper owns the visibility so it can't clash with the button's own display. */}
            <div className="hidden sm:block">
              <ButtonLink
                href={primaryCta.href}
                variant={transparent ? "outline-inverse" : "primary"}
                size="sm"
              >
                {primaryCta.label}
              </ButtonLink>
            </div>
            <MobileMenu pathname={pathname} />
          </div>
        </div>
      </header>
    </>
  );
}
