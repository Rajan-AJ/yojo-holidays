"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isPlaceholder, mainNav, primaryCta, siteConfig, type NavItem } from "@/config/site";
import { cn } from "@/lib/cn";
import { Arrow, HomeButton } from "@/components/home/ui";
import type { TourScope } from "@/types/content";
import { Wordmark } from "./wordmark";
import { MobileMenu } from "./mobile-menu";

export type NavDestinationLink = { id: string; name: string; href: string };

/**
 * Pages whose first section is a full-bleed hero the header can float over
 * (transparent until scrolled). Empty: the header is always solid.
 */
const OVERLAY_ROUTES = new Set<string>();

/** Distance scrolled before the header turns solid. */
const SOLID_AFTER_PX = 32;

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className={cn("size-3.5 shrink-0 transition-transform duration-(--duration-base)", className)}
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={cn("size-[18px] shrink-0", className)}>
      <path d="M12.04 2.1c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.33 4.95L2 22l5.19-1.36a9.87 9.87 0 0 0 4.85 1.24h.01c5.46 0 9.9-4.44 9.9-9.9s-4.45-9.88-9.91-9.88Zm5.8 14.14c-.25.69-1.44 1.32-1.99 1.4-.51.08-1.15.11-1.86-.12a16.7 16.7 0 0 1-1.71-.63c-3-1.3-4.96-4.32-5.11-4.52-.15-.2-1.22-1.62-1.22-3.1 0-1.47.77-2.19 1.05-2.49.27-.3.6-.37.8-.37h.57c.18 0 .43-.07.67.51l.92 2.21c.08.19.13.4.03.6-.1.2-.15.33-.3.5-.15.18-.31.4-.45.54-.15.15-.3.31-.13.6.17.3.76 1.23 1.64 2 1.13.98 2.08 1.3 2.38 1.45.3.15.48.13.65-.08.18-.2.74-.86.94-1.16.2-.3.4-.25.68-.15.28.1 1.76.83 2.06.98.3.15.5.22.57.35.08.13.08.73-.17 1.42Z" />
    </svg>
  );
}

/** Falls back to a muted, inert icon while the WhatsApp number is still a config placeholder. */
function WhatsAppLink({ value }: { value: string }) {
  const circle = "flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors";

  if (isPlaceholder(value)) {
    return (
      <span aria-hidden="true" className={cn(circle, "border-whatsapp/25 bg-whatsapp/10 text-whatsapp")}>
        <WhatsAppIcon />
      </span>
    );
  }
  const digits = value.replace(/\D/g, "");
  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className={cn(circle, "border-whatsapp/25 bg-whatsapp/10 text-whatsapp hover:bg-whatsapp/20")}
    >
      <WhatsAppIcon />
    </a>
  );
}

/** A nav item that opens a panel of top destinations for its scope, on hover or click. */
function ScopeNavLink({
  item,
  destinations,
  active,
  open,
  onOpen,
  onClose,
}: {
  item: NavItem;
  destinations: NavDestinationLink[];
  active: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <li className="relative" onMouseEnter={onOpen} onMouseLeave={onClose}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => (open ? onClose() : onOpen())}
        className={cn(
          "relative flex items-center gap-1 py-2 text-nav transition-opacity duration-(--duration-base) hover:opacity-100",
          "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-current after:transition-transform after:duration-(--duration-base) after:ease-(--ease-editorial)",
          active || open ? "opacity-100 after:scale-x-100" : "opacity-80 after:scale-x-0 hover:after:scale-x-100",
        )}
      >
        {item.label}
        <ChevronIcon className={open ? "-rotate-180" : undefined} />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full w-56 -translate-x-1/2 pt-3">
          <div className="rounded-card border border-line bg-canvas py-2 text-ink shadow-header">
            {destinations.map((d) => (
              <Link
                key={d.id}
                href={d.href}
                onClick={onClose}
                className="block px-4 py-2 text-body-sm text-ink/80 transition-colors hover:bg-ink/[0.04] hover:text-ink"
              >
                {d.name}
              </Link>
            ))}
            <Link
              href={item.href}
              onClick={onClose}
              className={cn(
                "block px-4 py-2 text-body-sm font-medium text-accent-strong transition-colors hover:bg-ink/[0.04]",
                destinations.length > 0 && "mt-1 border-t border-line pt-2.5",
              )}
            >
              All {item.label} tours
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}

export function Header({
  navDestinations,
}: {
  /** Top-level destinations per scope, for the India / International dropdowns. */
  navDestinations?: Partial<Record<TourScope, NavDestinationLink[]>>;
}) {
  const pathname = usePathname();
  const canOverlay = OVERLAY_ROUTES.has(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [openScope, setOpenScope] = useState<TourScope | null>(null);
  const navRef = useRef<HTMLUListElement>(null);

  // Close an open dropdown on navigation (the react.dev-recommended way to
  // reset state on prop/route change, without a setState-in-effect cascade).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpenScope(null);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SOLID_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!openScope) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpenScope(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenScope(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openScope]);

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
          <Wordmark onDark={transparent} priority />

          <nav aria-label="Main" className="hidden lg:block">
            <ul ref={navRef} className="flex items-center gap-6 xl:gap-9">
              {mainNav.map((item) => {
                const active = pathname.startsWith(item.href);

                if (item.scope) {
                  return (
                    <ScopeNavLink
                      key={item.href}
                      item={item}
                      destinations={navDestinations?.[item.scope] ?? []}
                      active={active}
                      open={openScope === item.scope}
                      onOpen={() => setOpenScope(item.scope!)}
                      onClose={() => setOpenScope(null)}
                    />
                  );
                }

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

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <WhatsAppLink value={siteConfig.contact.whatsapp} />
            </div>
            {/* Wrapper owns the visibility so it can't clash with the button's own display. */}
            <div className="hidden sm:block">
              <HomeButton href={primaryCta.href} size="sm">
                {primaryCta.label}
                <Arrow />
              </HomeButton>
            </div>
            <MobileMenu pathname={pathname} />
          </div>
        </div>
      </header>
    </>
  );
}
