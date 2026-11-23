import type { Metadata } from "next";
import { getTopLevelDestinations } from "@/server/queries";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { NotFoundContent } from "@/components/sections/not-found-content";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

// Root-level so it also catches unmatched URLs outside the (site) group;
// it renders the site chrome itself.
export default async function NotFound() {
  const [domestic, international] = await Promise.all([
    getTopLevelDestinations("DOMESTIC"),
    getTopLevelDestinations("INTERNATIONAL"),
  ]);
  const toLink = (list: typeof domestic) => list.slice(0, 6).map((d) => ({ id: d.id, name: d.name, href: d.href }));

  return (
    <>
      <Header navDestinations={{ DOMESTIC: toLink(domestic), INTERNATIONAL: toLink(international) }} />
      <main id="main" tabIndex={-1} className="outline-none">
        <NotFoundContent />
      </main>
      <Footer />
    </>
  );
}
