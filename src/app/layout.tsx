import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { siteConfig } from "@/config/site";
import "./globals.css";

// Self-hosted variable fonts (latin subset): no third-party request, no layout shift.
const inter = localFont({
  src: "./fonts/inter-latin-wght.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const playfair = localFont({
  src: [
    { path: "./fonts/playfair-display-latin-wght.woff2", style: "normal" },
    { path: "./fonts/playfair-display-latin-wght-italic.woff2", style: "italic" },
  ],
  variable: "--font-playfair",
  weight: "400 900",
  display: "swap",
});

// Display face for the homepage sections below the hero.
const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin-wght.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "swap",
});

const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | Domestic & International Tours, Visa Assistance`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: siteConfig.locale,
  },
  twitter: { card: "summary_large_image" },
  // Staging/preview deployments must never be indexed.
  robots: allowIndexing ? { index: true, follow: true } : { index: false, follow: false },
};

/** Only a well-formed container id is ever interpolated into the snippet. */
const GTM_ID = /^GTM-[A-Z0-9]{4,12}$/.test(process.env.NEXT_PUBLIC_GTM_ID ?? "") ? process.env.NEXT_PUBLIC_GTM_ID : undefined;

export const viewport: Viewport = {
  themeColor: "#f7f6f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${inter.variable} ${playfair.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
        {children}
        {GTM_ID && (
          // Google Tag Manager: Google Ads + Meta conversion tags are configured there
          // (the thank-you page pushes `generate_lead`). Loaded after the page is interactive.
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
          </Script>
        )}
      </body>
    </html>
  );
}
