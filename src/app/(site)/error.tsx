"use client";

import { Container } from "@/components/ui/container";
import { Button, ButtonLink } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

/** Error boundary for public pages. The header and footer stay in place. */
export default function SiteError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <Container className="pb-section pt-[calc(var(--spacing-header)+var(--spacing-section-sm))]">
      <ErrorState
        title="Something went wrong on our side."
        description="Please try again. If it keeps happening, head back to the homepage."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => retry()}>Try again</Button>
            <ButtonLink href="/" variant="outline">
              Back to home
            </ButtonLink>
          </div>
        }
      />
    </Container>
  );
}
