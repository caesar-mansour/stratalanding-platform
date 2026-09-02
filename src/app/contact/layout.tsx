import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Contact StrataLanding — Get a Response Within 24 Hours",
  description:
    "Get in touch with StrataLanding. We respond within 24 hours. 100% async — no calls needed. Email us about your landing page project.",
  path: "/contact",
  keywords: [
    "contact landing page studio",
    "landing page inquiry",
    "web design contact",
    "get in touch StrataLanding",
  ],
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
