import { Suspense } from "react";
import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { LeadConversion } from "@/components/forms/lead-conversion";

// Never indexed: it only makes sense after a submission.
export const metadata: Metadata = { title: "Thank you", robots: { index: false, follow: false } };

async function Reference({ searchParams }: { searchParams: PageProps<"/thank-you">["searchParams"] }) {
  const raw = (await searchParams).ref;
  const ref = typeof raw === "string" && /^YJ-\d{6,}$/.test(raw) ? raw : undefined;
  if (!ref || ref === "YJ-000000") return null;
  return (
    <>
      <p className="mt-8 text-body text-muted">
        Your reference is <strong className="font-semibold tabular-nums text-ink">{ref}</strong>. Mention it if you call or
        message us.
      </p>
      <LeadConversion reference={ref} />
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/thank-you">) {
  return (
    <Section>
      <Container size="narrow">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-accent-strong">Enquiry received</p>
          <h1 className="mt-4 font-display text-h1">Thank you. Your trip is in good hands.</h1>
          <p className="mt-6 text-body-lg text-muted">
            A travel specialist will look at your request and get in touch on the number you gave us.
          </p>
          <Suspense fallback={null}>
            <Reference searchParams={searchParams} />
          </Suspense>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <ButtonLink href={routes.tours()}>Browse tours</ButtonLink>
            <ButtonLink href={routes.home()} variant="ghost">
              Back to home
            </ButtonLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}
