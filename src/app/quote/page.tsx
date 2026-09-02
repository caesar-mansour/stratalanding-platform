import { Metadata } from "next";
import { brand } from "@/lib/brand";
import QuoteContent from "./QuoteContent";

export const metadata: Metadata = {
  title: "Get a Quote",
  description: `Request a free quote for your landing page project. ${brand.name} delivers strategy-first landing pages that convert. Get a detailed proposal within 24 hours.`,
  keywords:
    "landing page quote, free quote, landing page estimate, web design quote, project estimate",
  alternates: {
    canonical: `${brand.url}/quote`,
  },
  openGraph: {
    title: `Get a Free Quote | ${brand.name}`,
    description:
      "Request a free quote for your landing page project. Get a detailed proposal within 24 hours.",
    url: `${brand.url}/quote`,
  },
  twitter: {
    card: "summary_large_image",
    site: "@stratalanding",
    creator: "@stratalanding",
  },
};

export default function QuotePage() {
  return <QuoteContent />;
}
