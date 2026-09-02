import { PricingDetail } from "@/components/sections/PricingDetail";
import { pricing } from "@/lib/brand";
import { pageMetadata } from "@/lib/seo/metadata";
import { schemaGraph, serviceSchema } from "@/lib/seo/schemas";
import { safeJsonForScript } from "@/lib/html-utils";

export const metadata = pageMetadata({
  title: "Purchase Page - $9,600",
  description:
    "Turn visitors into customers with a complete 3-5 page conversion flow. Payment integration, webhooks, StrataMetrics funnel tracking, and 14-day post-launch support. Unlimited revisions.",
  path: "/pricing/purchase-page",
  keywords: [
    "purchase page pricing",
    "conversion flow landing page",
    "landing page $9600",
    "ecommerce landing page package",
    "checkout flow landing page",
  ],
});

export default function PurchasePagePricing() {
  const plan = pricing[2];

  // AUDIT 2026-08-12 (P2 SEO-28): serviceSchema() was fully written — Service + Offer with price,
  // currency, availability and termsOfService — and had ZERO callers, so the three tier pages
  // shipped no structured data at all and could not surface price in search results.
  const schemas = schemaGraph(serviceSchema("purchase-page"));

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonForScript(schemas) }}
    />
    <PricingDetail
      name={plan.name}
      price={plan.price}
      delivery={plan.delivery}
      description={plan.description}
      bestFor={plan.bestFor}
      features={[...plan.features]}
      deliverables={{ ...plan.deliverables }}
      ctaText={plan.cta}
      highlighted={plan.highlighted}
      planSlug="purchase-page"
    />
    </>
  );
}
