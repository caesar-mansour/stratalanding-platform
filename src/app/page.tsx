import type { Metadata } from "next";
import { readdirSync } from "fs";
import { join } from "path";
import "@/components/northline/nl.css";
import { northlineFontVars } from "@/components/northline/fonts";
import { NLRoot } from "@/components/northline/NLRoot";
import { ColourField } from "@/components/northline/ColourField";
import { SheetPassStyles } from "@/components/northline/SheetPass";
import { Hero } from "@/components/northline/sections/Hero";
import { Journey } from "@/components/northline/sections/Journey";
import { System } from "@/components/northline/sections/System";
import { Anatomy } from "@/components/northline/sections/Anatomy";
import { Compare } from "@/components/northline/sections/Compare";
import { Manifesto } from "@/components/northline/sections/Manifesto";
import { Spine } from "@/components/northline/sections/Spine";
import { Portal } from "@/components/northline/sections/Portal";
import { Process } from "@/components/northline/sections/Process";
import { Math as TheMath } from "@/components/northline/sections/Math";
import { Watching } from "@/components/northline/sections/Watching";
import { Receipts } from "@/components/northline/sections/Receipts";
import { Refusal } from "@/components/northline/sections/Refusal";
import { Assay } from "@/components/northline/sections/Assay";
import { Pricing } from "@/components/northline/sections/Pricing";
import { Start } from "@/components/northline/sections/Start";
import { brand, pricing, pricingFAQ, seo } from "@/lib/brand";
import { safeJsonForScript } from "@/lib/html-utils";
import {
  schemaGraph,
  faqPageSchema,
  breadcrumbSchema,
  webPageSchema,
  howToSchema,
} from "@/lib/seo/schemas";

/** The cheapest tier, by VALUE — the same rule the hero's "from" price obeys, so
 *  adding or reordering a tier cannot strand a stale number in the <title>. */
const fromPrice = pricing.reduce((a, b) =>
  Number(b.price.replace(/[^0-9.]/g, "")) < Number(a.price.replace(/[^0-9.]/g, "")) ? b : a
).price;

/* WHAT GOOGLE AND EVERY SOCIAL UNFURL USED TO SAY. All three fields below
   carried "Shipped in Days" — the claim brand.ts's own delivery windows
   contradict — and two of them typed "From $2,400" by hand. nl-audit's
   price rule only walks src/components/northline, so neither was gate-caught;
   the law is the same anywhere. Both are derived now. */
export const metadata: Metadata = {
  title: `${brand.name} — High-Performance Landing Pages, Built to a Fixed Price.`,
  description:
    `We design and build premium landing pages with Next.js. UI/UX, messaging, performance, forms, integrations, and tracking—all delivered async. No calls required. From ${fromPrice}.`,
  keywords:
    "landing page studio, landing page design, Next.js landing pages, conversion optimization, landing page development, high-performance landing pages, async web design, landing page agency",
  alternates: {
    canonical: brand.url,
  },
  openGraph: {
    title: `${brand.name} — High-Performance Landing Pages, Built to a Fixed Price.`,
    description:
      "Premium landing pages with Next.js. UI/UX, messaging, performance, forms, integrations, and tracking. No calls required.",
    url: brand.url,
    siteName: brand.name,
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: brand.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: seo.twitter.handle,
    creator: seo.twitter.handle,
    title: `${brand.name} — High-Performance Landing Pages`,
    description: `Premium landing pages, built to a fixed price. No calls required. From ${fromPrice}.`,
    images: ["/opengraph-image"],
  },
};

/**
 * The demo count is COMPUTED from the demos directory at render time — never
 * typed, never stale. Anywhere it is printed next to a word, the JSX needs an
 * explicit {" "} : the SWC minifier eats a plain space between an expression
 * and a string and has shipped "793pages" to production before.
 */
function countDemos(): number {
  try {
    return readdirSync(join(process.cwd(), "src", "app", "demos"), {
      withFileTypes: true,
    }).filter((d) => d.isDirectory()).length;
  } catch {
    // Fallback only fires if the read throws. Keep it near the real number so a
    // failure under-reports slightly rather than by a hundred.
    return 790;
  }
}

const homeSchemas = schemaGraph(
  faqPageSchema(pricingFAQ),
  breadcrumbSchema([{ name: "Home", url: brand.url }]),
  webPageSchema({
    name: `${brand.name} — High-Performance Landing Page Studio`,
    description: brand.description,
    url: brand.url,
  }),
  howToSchema()
);

/**
 * THE HOMEPAGE — the Northline design, wearing StrataLanding's brand.
 *
 * Structure: alternating registers. Paper sections are ledgers (ledger head,
 * hairlines, zero radius, zero shadow); navy stages are cinema (pinned, 3D,
 * elevation, a background plate). Never homogenise them — a long scroll where
 * every band has the same skeleton reads as one endless section, which is what
 * killed four earlier attempts.
 *
 * No Lenis here. NLEngine carries its own spring-damped wheel smoothing and the
 * scene timings were tuned against it; two smoothing layers fight each other.
 *
 * ⚠️ THIS ROUTE IS STATIC, AND KEEPING IT STATIC IS A PERFORMANCE CONTRACT.
 *
 * It used to be wrapped in <MobileShell>, which calls `await headers()` to sniff
 * the User-Agent, and one dynamic API makes the whole route render per request.
 *
 * ⚠️ AN EARLIER VERSION OF THIS COMMENT GAVE THE WRONG REASON, and the wrong
 * reason is worth naming because it is the kind that survives review. It said a
 * route that never prerenders never gets its critical CSS inlined, "Beasties
 * (`optimizeCss: true`) works on static HTML". Both halves are false. This route
 * DOES prerender now and still gets zero inlined CSS, because Beasties never
 * runs under the App Router at all: its only call site is
 * next/dist/server/post-process.js, reached solely from server/render.js — the
 * PAGES router — and app-render.js contains no reference to it. This repo has no
 * pages/ directory, and node_modules/critters does not even exist, so the path
 * would throw if it were ever reached. `experimental.optimizeCss` is inert here,
 * the same class of dead config as the `cssChunking: strict` already documented
 * in next.config.ts.
 *
 * The change is still right, for reasons that survive: TTFB 22ms → 5.6ms, and
 * the highest-traffic route is CDN-cacheable HTML instead of a per-request
 * render.
 *
 * The UA sniff bought nothing here. useStrataTier() gates on four conditions —
 *   !isMobile && desktop && !reduce && deviceTier !== "low"
 * — and `desktop` is matchMedia("(min-width:1025px) and (pointer:fine)"), which
 * every phone and every touch tablet already fails on its own. Without a
 * provider useIsMobile() returns false by design (MobileContext's default), so
 * the predicate is unchanged on every real phone. The only devices that move
 * are ≥1025px WITH a fine pointer that also report a mobile UA — an iPad with a
 * trackpad — and those flip A→B, which is the same treatment a laptop at that
 * size gets and is the correct answer for them anyway.
 *
 * MobileShell still exists and is still right for the routes that render the
 * strata bands; those genuinely read useIsMobile() to skip Framer Motion
 * hydration. Nothing in src/components/northline does.
 *
 * So: do not add headers(), cookies() or searchParams to this route, and do not
 * re-wrap it. The same rule the root layout has always had, for the same
 * reason — and here it also costs CDN caching on the busiest page.
 */
export default function HomePage() {
  const demoCount = countDemos();

  return (
    <div data-nl="root" data-nl-cursor="on" className={northlineFontVars}>
                {/* THE COLOUR FIELD — first child, z-index 0. Positioned siblings with
            z-auto paint after it in DOM order, which is what puts every section
            in front of it. It only becomes the sections' ground once it has
            been observed painting; until then each section paints itself, so
            the failure mode is "looks like today", never "text on nothing". */}
        <ColourField />
        <SheetPassStyles />

        {/* Fixed chrome + the scroll engine. Desktop/fine-pointer/motion-on
            only; renders null and loads no engine anywhere else. */}
        <NLRoot />

        {/* Page-wide grain. One inline SVG turbulence tile, multiply blend. */}
        <div aria-hidden className="nl-grain" />

        {/* 00 — the claim (SSR <h1> is the LCP) */}
        <Hero demoCount={demoCount} />

        {/*
          SECTION ORDER, and the register it alternates through. Paper sections
          are ledgers (hairlines, zero radius, zero shadow); navy sections are
          cinema (plates, elevation, scroll-driven). The alternation is the
          structural idea — homogenise it and a long scroll reads as one endless
          section, which is what killed four earlier attempts.
        */}

        {/* paper, pinned — THE OPENING FILM. Four acts: it builds a client's
            Presence page, grows the Lead page out of that page's own CTA,
            flips to the Purchase page, then docks the whole browser frame into
            the client portal. The longest scene on the page by far. */}
        <Journey />

        {/* paper — three pages, one job each */}
        <System />

        {/* navy, pinned — one page, five layers. The X-ray deck. */}
        <Anatomy />

        {/* paper 2 — the AI/DIY objection, on a drag seam */}
        <Compare />

        {/* navy — the belief statement */}
        <Manifesto />

        {/* navy, pinned — the tracking spine */}
        <Spine />

        {/* paper, pinned — the client portal walkthrough */}
        <Portal />

        {/* paper 2, pinned — how it works, on a horizontal track */}
        <Process />

        {/* paper 2 — what we turn down.
            MOVED UP, from just before the ledger to just before the worksheet.
            At zero client case studies, a published limit is one of the few
            proof substitutes a studio actually owns: naming the work we refuse
            is the cheapest possible signal that the rest of the page is not
            sales talk. It was doing that job at 88% depth, after the reader had
            already decided whether to believe us.

            It also earns its new neighbour. The worksheet asks the reader to set
            four sliders and think about their own money — that is effort, and
            nobody spends effort on a vendor they have not yet decided is
            honest. Belief first, then the arithmetic. */}
        <Refusal />

        {/* paper — the arithmetic, from the reader's own numbers */}
        <TheMath />

        {/* navy — the live session instrument */}
        <Watching />

        {/* navy — the record: two real clients, and the specimen archive */}
        <Receipts demoCount={demoCount} />

        {/* paper 2 — name the job, get the page. Sits immediately before the
            ledger so the visitor reads the prices with a tier already in mind. */}
        <Assay />

        {/* paper — the price ledger. The only place prices exist. */}
        <Pricing />

        {/* navy — the close + the async teardown intake */}
        <Start demoCount={demoCount} />
      {/* STRUCTURED DATA GOES LAST, and that is a measured decision.
          It used to be the FIRST child of the page. Measured on the production
          build: 24KB of schema sat between the <head> and the <h1>, so the
          browser had to receive and skip all of it before it reached the LCP
          element — 29KB in rather than 5KB. Nothing about structured data cares
          where in the document it lives; Google parses the whole thing. Being
          first cost 24KB of critical path for no benefit at all. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(homeSchemas) }}
      />
      </div>
  );
}
