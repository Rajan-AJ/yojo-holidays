import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { NotFoundContent } from "@/components/sections/not-found-content";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

// Root-level so it also catches unmatched URLs outside the (site) group;
// it renders the site chrome itself.
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        <NotFoundContent />
      </main>
      <Footer />
    </>
  );
}
