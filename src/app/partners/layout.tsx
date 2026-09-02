import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

/**
 * AUDIT 2026-08-12 (P2 SEO-27): /partners is a "use client" page with no metadata export and no
 * sibling layout, so it inherited the ROOT default title and description verbatim — duplicating
 * the homepage's title/description tag-for-tag, which is exactly the duplicate-metadata signal
 * that suppresses one of the two pages in search. It was also absent from the sitemap.
 */
export const metadata: Metadata = pageMetadata({
  title: "Partner Program — Refer Clients, Earn 20%",
  description:
    "Refer a business that needs a landing page and earn 20% of the project value. Fixed pricing, no calls, and you keep the relationship. Apply to the StrataLanding partner program.",
  path: "/partners",
  keywords: [
    "landing page referral program",
    "web design affiliate program",
    "agency partner program",
    "refer web design clients",
  ],
});

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
