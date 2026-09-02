import type { Metadata } from "next";
import { Outfit, Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { brand, seo } from "@/lib/brand";
import { SchemaOrg } from "@/components/seo/SchemaOrg";
// PERF: all marketing chrome (Navbar/Footer/Lenis/widgets/analytics) lives behind
// the MarketingChrome client boundary with dynamic imports, so standalone shells
// (/preview, /times) don't ship ~400KB of unused marketing JS (PageSpeed charges
// every pre-LCP script against LCP).
import { MarketingChrome } from "@/components/layout/MarketingChrome";

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  // 'optional' over 'swap': on slow networks, the browser keeps the
  // fallback font for that page load and never blocks LCP on the web
  // font arriving. The headline is the LCP element, so this directly
  // collapses the LCP-vs-FCP gap. Returns to Outfit on a cached visit.
  display: "optional",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  // Mirror Outfit: stay on the metric-matched fallback on slow networks
  // instead of late-swapping. Eliminates a second contentful re-render
  // pass and tightens Speed Index. Returns to Inter on cached visits.
  display: "optional",
});

// Editorial serif used ONLY by the /times shell — don't preload it on every page
// (a preloaded display:swap font gets charged against text LCP in PageSpeed's model).
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  // Italic enables the /preview letter signature — Fraunces' true italic has the
  // hand-cut swash forms; a synthesized oblique reads fake. Browsers only download
  // a face a page actually renders, so every other route pays nothing extra.
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: seo.defaultTitle,
    template: seo.titleTemplate,
  },
  description: seo.defaultDescription,
  metadataBase: new URL(brand.url),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: brand.url,
    siteName: brand.name,
    title: seo.defaultTitle,
    description: seo.defaultDescription,
    images: [
      {
        url: "/api/og/image",
        width: 1200,
        height: 630,
        alt: `${brand.name} — ${brand.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: seo.twitter.handle,
    creator: seo.twitter.handle,
    title: seo.defaultTitle,
    description: seo.defaultDescription,
    images: ["/api/og/image"],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
  // PERF: the full brand PNG is ~495KB — never ship it as a favicon (it rides on
  // every page's critical bandwidth). /icon.png is the 7KB properly-sized mark.
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StrataLanding",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

/**
 * ROOT LAYOUT — deliberately free of request APIs.
 *
 * AUDIT 2026-08-12 (PF-01): this used to `await headers()` for two things — an `x-pathname` the
 * proxy injected (to decide marketing chrome) and the User-Agent (to short-circuit Framer Motion
 * on phones). Reading a request API in the ROOT layout opts the ENTIRE route tree into dynamic
 * rendering, which is why 982 of 988 routes were server-rendered per request and only 6 were
 * static. Both reads have moved to where they are actually needed:
 *
 *   - chrome decision  -> MarketingChrome, via usePathname() (works in SSR and prerender)
 *   - theme-color      -> per-route `viewport` exports (the idiomatic Next mechanism)
 *   - mobile detection -> the routes whose components consume it, which stay dynamic on purpose
 *
 * Nothing here may read headers(), cookies() or searchParams, or every route becomes dynamic again.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <SchemaOrg />
      </head>
      <body
        className={`${outfit.variable} ${inter.variable} ${fraunces.variable} antialiased bg-background text-text-primary`}
      >
        <MarketingChrome>{children}</MarketingChrome>
      </body>
    </html>
  );
}
