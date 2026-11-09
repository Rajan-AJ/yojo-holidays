import type { ImageAsset, PassportRef, VisaDestinationOption } from "@/types/content";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button, ButtonLink, ArrowIcon } from "@/components/ui/button";
import { SelectField } from "@/components/ui/form-field";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Reveal } from "@/components/motion/reveal";
import { routes } from "@/lib/routes";

/**
 * Visa entry point. A plain GET form to the Visa Finder (works without
 * JavaScript): passport + destination from the database; the finder then asks
 * the purpose (only purposes that exist for that destination) and shows the
 * result. No requirements are stated here.
 */
export function VisaAssistance({
  passports,
  destinations,
  image,
}: {
  passports: PassportRef[];
  destinations: VisaDestinationOption[];
  image: ImageAsset;
}) {
  return (
    <Section tone="ink" aria-labelledby="visa-title" className="overflow-hidden">
      <Container size="wide">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading
              id="visa-title"
              eyebrow="Visa assistance"
              title="Your journey starts before you fly."
              intro="Not sure about visa requirements? Find the information you need and get help with your application."
              inverse
            />
            <Reveal variant="imageReveal" className="mt-12 hidden lg:block">
              <ResponsiveImage image={image} aspect="landscape" sizes="40vw" />
            </Reveal>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <form
              action={routes.visaFinder()}
              method="get"
              aria-labelledby="visa-form-title"
              className="on-light bg-canvas p-6 text-ink sm:p-10"
            >
              <h3 id="visa-form-title" className="text-h3">
                Check what you need
              </h3>
              <p className="mt-2 text-body-sm text-muted">
                Choose your passport and destination. The Visa Finder takes it from there.
              </p>

              <div className="mt-8 grid gap-5">
                <SelectField
                  label="Passport"
                  name="passport"
                  defaultValue={passports[0]?.isoCode}
                  options={passports.map((p) => ({
                    value: p.isoCode,
                    label: p.demonym ? `${p.demonym} passport` : p.name,
                  }))}
                />
                <SelectField
                  label="Destination"
                  name="destination"
                  required
                  defaultValue=""
                  placeholder="Choose a destination"
                  options={destinations.map((d) => ({ value: d.slug, label: d.name }))}
                />
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Button type="submit" size="lg">
                  Find my visa
                </Button>
                <ButtonLink href={routes.visa()} variant="ghost">
                  Visa assistance
                  <ArrowIcon />
                </ButtonLink>
              </div>
            </form>
          </div>
        </div>
      </Container>
    </Section>
  );
}
