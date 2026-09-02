import { PricingDetail } from "@/components/sections/PricingDetail";
import { pricing } from "@/lib/brand";
import { pageMetadata } from "@/lib/seo/metadata";
import { schemaGraph, serviceSchema } from "@/lib/seo/schemas";
import { safeJsonForScript } from "@/lib/html-utils";

export const metadata = pageMetadata({
  title: "Presence Page - $2,400",
  description:
    "Establish credibility with a single, high-performance landing page. Premium mobile-first UI/UX, copy refinement, StrataMetrics tracking, and Core Web Vitals optimization. 7-10 business days, 6 revision rounds.",
  path: "/pricing/presence-page",
  keywords: [
    "presence page pricing",
    "single landing page cost",
    "landing page $2400",
    "basic landing page package",
    "credibility landing page",
  ],
});

export default function PresencePagePricing() {
  const plan = pricing[0];

  // AUDIT 2026-08-12 (P2 SEO-28): serviceSchema() was fully written — Service + Offer with price,
  // currency, availability and termsOfService — and had ZERO callers, so the three tier pages
  // shipped no structured data at all and could not surface price in search results.
  const schemas = schemaGraph(serviceSchema("presence-page"));

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
      planSlug="presence-page"
    />
    </>
  );
}
