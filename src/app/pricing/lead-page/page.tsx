import { PricingDetail } from "@/components/sections/PricingDetail";
import { pricing } from "@/lib/brand";
import { pageMetadata } from "@/lib/seo/metadata";
import { schemaGraph, serviceSchema } from "@/lib/seo/schemas";
import { safeJsonForScript } from "@/lib/html-utils";

export const metadata = pageMetadata({
  title: "Lead Page - $4,800",
  description:
    "Capture qualified leads with a conversion-optimized landing page, thank-you page, form integration, StrataMetrics event tracking, and micro-interactions. Unlimited revisions, 10-14 business days.",
  path: "/pricing/lead-page",
  keywords: [
    "lead page pricing",
    "lead generation landing page",
    "landing page $4800",
    "conversion landing page package",
    "form integration landing page",
  ],
});

export default function LeadPagePricing() {
  const plan = pricing[1];

  // AUDIT 2026-08-12 (P2 SEO-28): serviceSchema() was fully written — Service + Offer with price,
  // currency, availability and termsOfService — and had ZERO callers, so the three tier pages
  // shipped no structured data at all and could not surface price in search results.
  const schemas = schemaGraph(serviceSchema("lead-page"));

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
      planSlug="lead-page"
    />
    </>
  );
}
