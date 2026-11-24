import type { Metadata } from "next";

// The admin is never indexed and never cached by search engines.
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Yojo Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-[#f6f5f2] text-ink">{children}</div>;
}
