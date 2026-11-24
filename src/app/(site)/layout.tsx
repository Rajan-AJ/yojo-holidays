import { getSiteSettings, getTopLevelDestinations } from "@/server/queries";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MotionProvider } from "@/components/motion/motion-provider";
import { AttributionCapture } from "@/components/forms/attribution-capture";

/** Destinations shown in the header's India / International dropdowns. */
async function getHeaderNavDestinations() {
  const [domestic, international] = await Promise.all([
    getTopLevelDestinations("DOMESTIC"),
    getTopLevelDestinations("INTERNATIONAL"),
  ]);
  const toLink = (list: typeof domestic) => list.slice(0, 6).map((d) => ({ id: d.id, name: d.name, href: d.href }));
  return { DOMESTIC: toLink(domestic), INTERNATIONAL: toLink(international) };
}

// Public website shell. /admin has its own layout without these.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [navDestinations, settings] = await Promise.all([getHeaderNavDestinations(), getSiteSettings()]);

  return (
    <MotionProvider>
      {/* Scroll-reveal content starts hidden for the animation; without JS, show it. */}
      <noscript>
        <style>{`[data-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}`}</style>
      </noscript>
      <Header navDestinations={navDestinations} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
      <AttributionCapture />
      {settings?.whatsapp && <WhatsAppButton number={settings.whatsapp} />}
    </MotionProvider>
  );
}
