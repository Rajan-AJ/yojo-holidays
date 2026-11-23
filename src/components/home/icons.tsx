import { cn } from "@/lib/cn";

export type HomeIcon =
  | "compass"
  | "globe"
  | "passport"
  | "route"
  | "users"
  | "receipt"
  | "chat"
  | "plane"
  | "check"
  | "heart"
  | "star"
  | "mountain"
  | "ship"
  | "sun"
  | "map"
  | "shield";

/** Line icons for the homepage. 24px grid, 1.6 stroke, currentColor. */
const paths: Record<HomeIcon, React.ReactNode> = {
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
    </>
  ),
  passport: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="10.5" r="3" />
      <path d="M9 17h6" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M8 18h7.5a3 3 0 000-6h-7a3 3 0 010-6H16" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.3c2.1.7 3.5 2.8 3.5 5.7" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  chat: (
    <path d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v8a2.5 2.5 0 01-2.5 2.5H10l-5 4v-4.2A2.5 2.5 0 014 13.5v-8z" />
  ),
  plane: <path d="M21 4L3 11l6.5 2.5L12 20l3-5.5M21 4l-6 11M21 4L9.5 13.5" />,
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16 9.8" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.3 4.3 4.3 0 0119.5 10c0 5.4-7.5 10-7.5 10z" />,
  star: <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3z" />,
  mountain: (
    <>
      <path d="M2.5 20L9 8l4 7 2.5-4L21.5 20h-19z" />
      <path d="M7.5 10.8l1.5 1.2 1.5-1.2" />
    </>
  ),
  ship: (
    <>
      <path d="M3 18c1.5 1.3 3 1.3 4.5 0s3-1.3 4.5 0 3 1.3 4.5 0 3-1.3 4.5 0" />
      <path d="M5 15l-1-4h16l-1 4M7 11V7h10v4M12 7V3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  map: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7.5 3v6c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6L12 3z" />
      <path d="M8.8 12l2.2 2.2 4.2-4.2" />
    </>
  ),
};

export function Icon({ name, className }: { name: HomeIcon; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-6", className)}
    >
      {paths[name]}
    </svg>
  );
}

/** Gradient fills for icon tiles; cycled so neighbouring tiles differ. */
export const tileGradients = [
  "from-brand-pink to-rose-400",
  "from-brand-teal to-cyan-400",
  "from-brand-navy to-indigo-500",
  "from-amber-500 to-orange-400",
  "from-violet-600 to-fuchsia-400",
  "from-emerald-500 to-teal-400",
] as const;

/** Rounded gradient square holding a white icon. */
export function GradientIcon({
  name,
  index = 0,
  size = "md",
  className,
}: {
  name: HomeIcon;
  /** Picks the gradient (cycled). */
  index?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-linear-to-br text-white shadow-sm",
        tileGradients[index % tileGradients.length],
        size === "md" ? "size-12 rounded-xl" : "size-10 rounded-xl",
        className,
      )}
    >
      <Icon name={name} className={size === "md" ? "size-6" : "size-5"} />
    </span>
  );
}
