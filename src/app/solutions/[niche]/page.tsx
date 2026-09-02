import type { Metadata } from "next";
import { brand, seo } from "@/lib/brand";
import { solutionNicheData } from "@/lib/seo/niche-data";
import {
  schemaGraph,
  breadcrumbSchema,
  webPageSchema,
} from "@/lib/seo/schemas";
import SolutionContent from "./SolutionContent";
import { safeJsonForScript } from "@/lib/html-utils";

export function generateStaticParams() {
  return Object.keys(solutionNicheData).map((niche) => ({ niche }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ niche: string }>;
}): Promise<Metadata> {
  const { niche } = await params;
  const data = solutionNicheData[niche];

  if (!data) {
    return { title: "Solutions" };
  }

  const url = `${brand.url}/solutions/${niche}`;

  return {
    title: data.title,
    description: data.description,
    keywords: data.keywords.join(", "),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${data.title} | ${brand.name}`,
      description: data.description,
      url,
      siteName: brand.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: seo.twitter.handle,
      creator: seo.twitter.handle,
      title: `${data.title} | ${brand.name}`,
      description: data.description,
    },
  };
}

export default async function SolutionPage({
  params,
}: {
  params: Promise<{ niche: string }>;
}) {
  const { niche } = await params;
  const data = solutionNicheData[niche];
  const url = `${brand.url}/solutions/${niche}`;
  const nicheLabel =
    niche.charAt(0).toUpperCase() + niche.slice(1).replace(/-/g, " ");

  const schemas = schemaGraph(
    breadcrumbSchema([
      { name: "Home", url: brand.url },
      // AUDIT 2026-08-12 (P2 SEO-20): a "Solutions" crumb pointing at /solutions was removed —
      // that URL has no page (the directory contains only [niche]), so the breadcrumb was
      // advertising a 404 to Google on all 25 solution pages.
      { name: `${nicheLabel} Landing Pages`, url },
    ]),
    webPageSchema({
      name: data?.title || `${nicheLabel} Landing Pages`,
      description:
        data?.description || `Landing pages for ${nicheLabel} companies`,
      url,
    })
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(schemas) }}
      />
      <SolutionContent niche={niche} />
    </>
  );
}
