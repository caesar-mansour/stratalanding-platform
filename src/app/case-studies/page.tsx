import { brand } from "@/lib/brand";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  schemaGraph,
  breadcrumbSchema,
  webPageSchema,
} from "@/lib/seo/schemas";
import CaseStudiesContent from "./CaseStudiesContent";
import { safeJsonForScript } from "@/lib/html-utils";

export const metadata = pageMetadata({
  /* WAS "Case Studies — Real Results, Real Data", described as "showing
     conversion improvements, performance gains, and ROI". None of that exists:
     this studio is pre-revenue with one public client and has never measured a
     conversion lift for anyone. The homepage says so IN ITS OWN VOICE — "a new
     studio with one public client and no curated case studies" — so a visitor
     was one click from catching the site contradicting itself, on the more
     legally exposed side.
     The entry below is real, the work is real, and the honest frame is
     the work rather than results nobody measured. */
  title: "The work — a client build",
  description: `A page ${brand.name} designed and built, with what it was for and what shipped. No conversion figures: this is a new studio and nothing here has been measured.`,
  path: "/case-studies",
  keywords: [
    "landing page case studies",
    "landing page design",
    "landing page portfolio",
    "studio portfolio",
    "web design case studies",
  ],
});

const caseStudySchemas = schemaGraph(
  breadcrumbSchema([
    { name: "Home", url: brand.url },
    { name: "Case Studies", url: `${brand.url}/case-studies` },
  ]),
  webPageSchema({
    /* The structured data made the same unmeasured claim as the <title>, and
       structured data is the half a human never sees and Google always does. */
    name: "The work",
    description: `A page ${brand.name} designed and built. No conversion figures — nothing here has been measured.`,
    url: `${brand.url}/case-studies`,
  })
);

export default function CaseStudiesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(caseStudySchemas) }}
      />
      <CaseStudiesContent />
    </>
  );
}
