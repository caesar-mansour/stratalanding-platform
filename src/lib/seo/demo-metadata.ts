import type { Metadata } from "next";
import { brand, seo } from "@/lib/brand";
import { getDemoBySlug, slugToTitle } from "@/lib/demo-registry";

/**
 * Generate unique, keyword-rich metadata for each demo page.
 * Called from each demo's generated layout.tsx.
 */
/**
 * AUDIT 2026-08-12 (P1 SEO-17). Every demo page is noindex,follow.
 *
 * Founder decision: the 793 demos are SALES assets shown to prospects, not SEO assets. Left
 * indexable they were 793 near-identical template pages on one domain — thin/duplicate content at
 * a scale that drags down the whole site's authority — and, worse, they publish fabricated
 * businesses making concrete claims ("10,000+ Happy Clients", "98% Satisfaction Rate", "5.0 on
 * Google (200+ reviews)") with no disclosure that they are demonstrations. Indexed, those read as
 * real testimonials for a real business.
 *
 * `follow` is deliberate: crawlers still traverse to /brief and /pricing, so the links keep their
 * value; only the demo pages themselves stay out of the index.
 */
const DEMO_ROBOTS = {
  index: false,
  follow: true,
  googleBot: { index: false, follow: true },
} as const;

export function generateDemoMetadata(slug: string): Metadata {
  const demo = getDemoBySlug(slug);

  // If demo found in registry, use its rich data
  if (demo) {
    const title = `${demo.title} Landing Page Template`;
    const description = `${demo.description} Browse this ${demo.category} landing page demo designed to ${demo.goalLabel.toLowerCase()}. Built with Next.js, mobile-first, conversion-optimized.`;
    const url = `${brand.url}/demos/${slug}`;
    const ogImageUrl = `/api/og/demo?slug=${slug}`;

    return {
      robots: DEMO_ROBOTS,
      title,
      description,
      keywords: [
        `${demo.title} landing page`,
        `${demo.category.toLowerCase()} landing page template`,
        `${demo.goalLabel.toLowerCase()} landing page`,
        "landing page demo",
        demo.bestFor,
      ].join(", "),
      alternates: {
        canonical: url,
      },
      openGraph: {
        title: `${title} | ${brand.name}`,
        description,
        url,
        siteName: brand.name,
        type: "website",
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `${demo.title} Landing Page Demo - ${brand.name}`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ${brand.name}`,
        description,
        site: seo.twitter.handle,
        creator: seo.twitter.handle,
        images: [ogImageUrl],
      },
    };
  }

  // Fallback: generate metadata from slug
  const readableTitle = slugToTitle(slug);
  const title = `${readableTitle} Landing Page Template`;
  const description = `Browse the ${readableTitle} landing page demo. Premium design, mobile-first, conversion-optimized. Built with Next.js by ${brand.name}.`;
  const url = `${brand.url}/demos/${slug}`;
  const ogImageUrl = `/api/og/demo?slug=${slug}`;

  return {
    robots: DEMO_ROBOTS,
    title,
    description,
    keywords: [
      `${readableTitle} landing page`,
      "landing page template",
      "landing page demo",
      `${readableTitle.toLowerCase()} website`,
    ].join(", "),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${title} | ${brand.name}`,
      description,
      url,
      siteName: brand.name,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${readableTitle} Landing Page Demo - ${brand.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${brand.name}`,
      description,
      site: seo.twitter.handle,
      creator: seo.twitter.handle,
      images: [ogImageUrl],
    },
  };
}
