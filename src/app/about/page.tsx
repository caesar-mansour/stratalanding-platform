import { brand } from "@/lib/brand";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  schemaGraph,
  organizationSchema,
  breadcrumbSchema,
  webPageSchema,
} from "@/lib/seo/schemas";
import { safeJsonForScript } from "@/lib/html-utils";
import AboutContent from "./AboutContent";

export const metadata = pageMetadata({
  title: `About ${brand.name} — Landing Page Studio`,
  description: `${brand.name} is a landing page studio. We design and build premium, fast landing pages—delivered async. No agency overhead. No bloated retainers.`,
  path: "/about",
  keywords: [
    "about StrataLanding",
    "landing page studio",
    "async web design",
    "no-call web agency",
    "landing page team",
  ],
});

const aboutSchemas = schemaGraph(
  organizationSchema(),
  breadcrumbSchema([
    { name: "Home", url: brand.url },
    { name: "About", url: `${brand.url}/about` },
  ]),
  webPageSchema({
    name: `About ${brand.name}`,
    description: brand.description,
    url: `${brand.url}/about`,
  })
);

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(aboutSchemas) }}
      />
      <AboutContent />
    </>
  );
}
