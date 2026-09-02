import type { Metadata } from "next";
import { brand, seo } from "@/lib/brand";

interface PageMetadataOptions {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  ogImage?: string;
  noIndex?: boolean;
}

export function pageMetadata({
  title,
  description,
  path,
  keywords,
  ogImage,
  noIndex,
}: PageMetadataOptions): Metadata {
  const url = `${brand.url}${path}`;
  // AUDIT 2026-08-12: this defaulted to "/brand/og-image.png", which DOES NOT EXIST
  // (public/brand/ contains only stratalanding.png). Every page built through pageMetadata()
  // — /about, /contact, /blog, /pricing/*, /solutions/* — therefore shipped an og:image that
  // 404s, so every link shared on X, LinkedIn, in a cold email or a DM rendered with no preview
  // image at all. src/app/opengraph-image.tsx already generates a real card; use it.
  const image = ogImage || "/opengraph-image";

  return {
    title,
    description,
    ...(keywords && keywords.length > 0 && { keywords: keywords.join(", ") }),
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
          url: image,
          width: 1200,
          height: 630,
          alt: `${title} - ${brand.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${brand.name}`,
      description,
      site: seo.twitter.handle,
      creator: seo.twitter.handle,
      images: [image],
    },
    ...(noIndex && {
      robots: { index: false, follow: false },
    }),
  };
}
