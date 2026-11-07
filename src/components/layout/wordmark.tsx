import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";

/**
 * Typographic wordmark used until a transparent SVG/PNG logo is supplied.
 * The current logo file is a JPG on a white background, which cannot sit on
 * the transparent header over the hero image.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("font-serif text-2xl leading-none tracking-tight", className)}
      aria-label={`${siteConfig.name}, home`}
    >
      Yojo<span className="text-accent">.</span>
      <span className="ml-1.5 align-middle font-sans text-[0.625rem] font-medium uppercase tracking-[0.3em]">
        Holidays
      </span>
    </Link>
  );
}
