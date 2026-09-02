import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Landing Page Pricing — Fixed Scope, No Surprises",
  description:
    "Fixed-scope landing page pricing. Presence Page $2,400, Lead Page $4,800, Purchase Page $9,600. Clear deliverables, timelines, and revision rounds. No calls, no surprises. You own everything.",
  path: "/pricing",
  keywords: [
    "landing page pricing",
    "landing page cost",
    "web design pricing",
    "landing page packages",
    "fixed price landing page",
    "how much does a landing page cost",
  ],
});

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
