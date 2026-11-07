import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

// Root-level so it also catches unmatched URLs; renders the site chrome itself.
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        <Container className="pb-(--spacing-section) pt-[calc(var(--spacing-header)+var(--spacing-section))]">
          <p className="text-eyebrow uppercase text-accent-strong">404</p>
          <h1 className="mt-5 text-headline">This page has wandered off.</h1>
          <p className="mt-5 max-w-md text-lg text-muted">
            The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>
          <ButtonLink href="/" className="mt-10">
            Back to home
          </ButtonLink>
        </Container>
      </main>
      <Footer />
    </>
  );
}
