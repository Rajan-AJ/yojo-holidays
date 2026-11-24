"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

export type NavGroup = { label: string; items: { href: string; label: string; icon: "home" | "inbox" | "dot" }[] };

function Icon({ name }: { name: "home" | "inbox" | "dot" }) {
  if (name === "dot") return <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-50" />;
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      {name === "home" ? <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /> : <path d="M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" />}
    </svg>
  );
}

export function AdminNav({
  groups,
  user,
  signOut,
}: {
  groups: NavGroup[];
  user: { name: string; roles: string[] };
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/admin/" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(href.replace(/\/$/, "")));

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-brand-navy px-4 py-3 text-white lg:hidden">
        <span className="font-display text-lg">Yojo Admin</span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-lg border border-white/20 px-3 py-1.5 text-body-sm" aria-expanded={open}>
          Menu
        </button>
      </div>
      <aside
        className={cn(
          "bg-brand-navy text-white/80 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col",
          open ? "block" : "hidden lg:flex",
        )}
      >
        <div className="hidden px-6 pb-4 pt-7 lg:block">
          <Link href="/admin/" className="font-display text-xl text-white">
            Yojo <span className="text-brand-pink">Admin</span>
          </Link>
        </div>
        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 pb-6">
          {groups.map((g) => (
            <div key={g.label || "main"} className="mt-4 first:mt-0">
              {g.label && <p className="px-3 pb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white/40">{g.label}</p>}
              <ul>
                {g.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active(item.href) ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-[0.9rem] transition-colors",
                        active(item.href) ? "bg-white/12 font-medium text-white" : "hover:bg-white/6 hover:text-white",
                      )}
                    >
                      <Icon name={item.icon} />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-6 py-5">
          <p className="truncate text-body-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-caption capitalize text-white/50">{user.roles.join(", ")}</p>
          <div className="mt-3 flex gap-4 text-caption">
            <Link href="/" className="hover:text-white" target="_blank">
              View site ↗
            </Link>
            <form action={signOut}>
              <button type="submit" className="hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
