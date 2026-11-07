import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

// Public website shell. /admin gets its own layout (Phase 11) without these.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
