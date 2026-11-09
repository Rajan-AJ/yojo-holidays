import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { routes } from "@/lib/routes";

/** 404 body, shared by the root not-found and the public-site not-found. */
export function NotFoundContent() {
  return (
    <Container className="pb-section pt-[calc(var(--spacing-header)+var(--spacing-section))]">
      <p className="eyebrow text-accent-strong">404</p>
      <h1 className="mt-5 text-h1">This page has wandered off.</h1>
      <p className="mt-5 max-w-md text-body-lg text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has moved. These might help:
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href={routes.home()}>Back to home</ButtonLink>
        <ButtonLink href={routes.destinations()} variant="outline">
          Explore destinations
        </ButtonLink>
      </div>
      <form action={routes.search()} method="get" role="search" className="mt-10 max-w-md">
        <label htmlFor="nf-search" className="text-body-sm font-medium">
          Or search for a destination or tour
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="nf-search"
            name="q"
            type="search"
            className="min-h-12 min-w-0 flex-1 rounded-field border border-line-strong bg-surface px-4"
          />
          <button type="submit" className="min-h-12 rounded-full bg-ink px-6 text-button font-medium text-canvas">
            Search
          </button>
        </div>
      </form>
      <p className="mt-8 text-body-sm text-muted">
        Popular: <Link href={routes.tours()} className="underline underline-offset-4">all tours</Link>,{" "}
        <Link href={routes.scope("INTERNATIONAL")} className="underline underline-offset-4">international</Link>,{" "}
        <Link href={routes.scope("DOMESTIC")} className="underline underline-offset-4">domestic</Link>.
      </p>
    </Container>
  );
}
