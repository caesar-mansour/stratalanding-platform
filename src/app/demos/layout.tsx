import type { Metadata } from "next";
import { DemoLayoutWrapper } from "@/components/layout/DemoLayoutWrapper";
// Demo-only Tailwind utilities — excluded from the global sheet (see globals.css
// `@source not "./demos"`), so the rest of the app doesn't pay for 793 demos.
import "./demos.css";

// AUDIT 2026-08-12 (PF-01): demos stay force-dynamic, DELIBERATELY, and the reason is now measured
// rather than assumed.
//
// Removing this flag was tried: it surfaced genuine prerender failures across the demo corpus —
// missing icon imports (ReferenceError: Shield is not defined) and module-scope `window` access
// (ReferenceError: window is not defined). Those are real defects in individual demo files, and
// they are ALSO why the flag exists: dynamic rendering hides them because the failure only occurs
// when someone actually visits, and nobody visits most of the 793.
//
// Fixing 793 generated sales pages to buy CDN caching on noindex assets is a poor trade, so the
// flag stays and the genuinely broken demos are fixed individually instead. The routes that
// mattered for static rendering — the marketing pages — are now static; see src/app/layout.tsx.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demo Pages — 700+ Landing Page Templates by Industry",
  description:
    "Browse 700+ landing page demos organized by industry and conversion goal. Healthcare, SaaS, real estate, ecommerce, coaching, legal, and more. Find your starting point.",
  keywords:
    "landing page templates, landing page demos, landing page examples, industry landing pages, conversion templates, landing page inspiration",
  alternates: {
    canonical: "https://stratalanding.com/demos",
  },
  openGraph: {
    title: "700+ Landing Page Demos | StrataLanding",
    description:
      "Browse landing page demos organized by industry and conversion goal. Find your starting point.",
    url: "https://stratalanding.com/demos",
  },
  twitter: {
    card: "summary_large_image",
    site: "@stratalanding",
    creator: "@stratalanding",
  },
};

export default function DemosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DemoLayoutWrapper>{children}</DemoLayoutWrapper>;
}
