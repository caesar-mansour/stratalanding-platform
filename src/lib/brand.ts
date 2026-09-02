// StrataLanding Brand Constants
// Landing Page Studio - NOT a marketing agency

export const brand = {
  name: "StrataLanding",
  /* "Shipped in days" was false, and it was false in five places at once: here
     (this string renders in the site footer), the homepage <title>, its OG
     title, its Twitter description, and a row in the comparison table. The
     published delivery windows below are 7-10 / 10-14 / 14-21 BUSINESS days —
     up to about four calendar weeks — and the same homepage renders them
     verbatim in the system section and the pricing ledger. A visitor who
     scrolled saw both claims in one session.

     The demo count came out too: it was hand-typed as "790+" while
     scripts/nl-audit.cjs forbids exactly that and page.tsx counts the directory
     at build time. A number you can compute has no business being typed. */
  tagline: "High-performance landing pages, built to a fixed price.",
  description: "Premium landing pages designed and built with Next.js — UI/UX, copywriting, performance, forms, and tracking included. Delivered async, on a date fixed before we start. No calls required.",

  // Contact
  email: "stratalanding@gmail.com",

  // Social
  social: {
    twitter: "https://twitter.com/stratalanding",
    linkedin: "https://linkedin.com/company/stratalanding",
    instagram: "https://instagram.com/stratalanding",
  },

  // URLs
  url: "https://stratalanding.com",
} as const;

// Template Selling System - Price for source code
export const templatePricing = {
  "presence-page": 149,
  "lead-page": 299,
  "purchase-page": 499,
} as const;

// CTA System - Single dominant conversion path
export const cta = {
  primary: {
    label: "Start your brief", // ⚠️ Stage&Paper: ONE label site-wide (sign-off sheet item 2)
    href: "/brief",
  },
  secondary: {
    label: "Browse the demos", // Stage&Paper: one demos label everywhere
    href: "/demos",
  },
  microcopy: "No calls required. Direct chat access with our team.",
  supportingMicrocopy: "Proposal in 24 hours. Fixed scope. Clear timeline.",
  closingMicrocopy: "Start the brief. Get a proposal in 24h.",
  reassurance: "No calls. Clear scope. Delivered fast.",
} as const;

export const colors = {
  primary: "#0B1B3A",      // Deep Navy
  accent: "#0891B2",       // Cyan/Teal
  background: "#F8FAFC",   // Off White
  surface: "#FFFFFF",      // White
  textPrimary: "#0F172A",  // Near Black
  textMuted: "#334155",    // Slate
  border: "#E2E8F0",       // Light Gray
} as const;

export const typography = {
  heading: '"Plus Jakarta Sans", sans-serif',
  body: '"Inter", sans-serif',
} as const;

// SEO defaults
export const seo = {
  titleTemplate: `%s | ${brand.name}`,
  defaultTitle: `${brand.name} - High-Performance Landing Page Studio`,
  defaultDescription: brand.description,
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: brand.name,
  },
  twitter: {
    handle: "@stratalanding",
    cardType: "summary_large_image",
  },
} as const;

// Navigation links
export const navigation = {
  /* "CASE STUDIES" IS GONE FROM BOTH LISTS, and it is a truth fix rather than a
     layout one. The homepage says in its own voice, in Receipts: "A new studio
     with one public client and no curated case studies." The link landed on a
     page titled "Case Studies — Real Results, Real Data" promising "conversion
     improvements, performance gains, and ROI". A visitor was one click from
     catching the page contradicting itself, and the claim on the far side is the
     kind a pre-revenue studio cannot make.

     `navigation` is consumed by four components, so this removes the link from
     every route, which is intended. The ROUTE still exists and is still in the
     sitemap — de-linking and de-indexing are separate decisions, and the route's
     own copy is fixed separately. The archive of demos in Receipts already
     carries the proof load, and it is honest about what those demos are. */
  main: [
    { label: "Demos", href: "/demos" },
    { label: "Blog", href: "/blog" },
    { label: "Start your brief", href: "/brief", isPrimary: true }, // ⚠️ one label site-wide (Stage&Paper)
  ],
  demos: [
    { label: "Book Calls", href: "/demos?goal=calls", tag: "Booking" },
    { label: "Collect Emails", href: "/demos?goal=emails", tag: "Lead Gen" },
    { label: "Sell Products", href: "/demos?goal=sales", tag: "Ecommerce" },
    { label: "Request Quotes", href: "/demos?goal=quotes", tag: "Lead Gen" },
  ],
  footer: [
    {
      title: "Pages",
      links: [
        { label: "Demos", href: "/demos" },
        { label: "Pricing", href: "/#pricing" },
        { label: "How It Works", href: "/#how-it-works" },
        // Absorbed from the "Resources" column, which had nothing else left in
        // it once Case Studies came out. A heading over one link is furniture.
        { label: "Blog", href: "/blog" },
      ],
    },
    {
      title: "By Goal",
      links: [
        { label: "Book Calls", href: "/demos?goal=calls" },
        { label: "Collect Emails", href: "/demos?goal=emails" },
        { label: "Sell Products", href: "/demos?goal=sales" },
        { label: "Request Quotes", href: "/demos?goal=quotes" },
      ],
    },
    {
      title: "Start",
      links: [
        { label: "Start your brief", href: "/brief" }, // ONE label site-wide (cta.primary law)
        { label: "Contact", href: "/contact" },
        { label: "Partners", href: "/partners" },
      ],
    },
  ],
} as const;

// Pricing packages - Build studio, not agency
export const pricing = [
  {
    name: "Presence Page",
    slug: "presence-page",
    price: "$2,400",
    description: "Establish credibility with a single, high-performance landing page.",
    bestFor: "Founders, consultants, and early-stage brands who need a polished online presence—fast.",
    features: [
      "1 landing page (5–7 sections)",
      "Premium mobile-first UI/UX design",
      "Copy refinement: headlines, section copy, CTAs",
      "StrataMetrics installation (page_view tracking)",
      "Core Web Vitals optimization (LCP <2.5s, CLS <0.1, INP <200ms)",
      "6 revision rounds",
    ],
    deliverables: {
      pages: "1 landing page",
      tracking: "StrataMetrics page_view",
      /* The count, machine-readable. The prose beside it has always said this;
         nothing could READ it, so Spine.tsx and Journey.tsx both printed an
         invented "7 tracked events per session" — a number that matches no
         tier, in a unit ("per session") that is not how any of them are sold. */
      trackedEvents: 1,
      integrations: "—",
      revisions: "6 rounds",
    },
    delivery: "7–10 business days",
    cta: "Get a Presence Page",
    highlighted: false,
  },
  {
    name: "Lead Page",
    slug: "lead-page",
    price: "$4,800",
    description: "Capture qualified leads with a conversion-optimized page and tracking.",
    bestFor: "Businesses ready to generate leads through a dedicated landing page with form capture and event tracking.",
    features: [
      "1 landing page + 1 thank-you page",
      "Lead form integration (connected to your email tool or CRM)",
      "StrataMetrics event tracking: cta_click, form_start, form_submit, thank_you_view",
      "Micro-interactions for premium feel (hover states, transitions, feedback)",
      "Premium mobile-first UI/UX design",
      "Copy refinement: headlines, section copy, CTAs",
      "Core Web Vitals optimization (LCP <2.5s, CLS <0.1, INP <200ms)",
      "Unlimited revisions",
    ],
    deliverables: {
      pages: "2 pages (landing + thank-you)",
      tracking: "StrataMetrics events (4 events)",
      trackedEvents: 4,
      integrations: "Email/CRM form connection",
      revisions: "Unlimited",
    },
    delivery: "10–14 business days",
    cta: "Build My Lead Page",
    highlighted: true,
  },
  {
    name: "Purchase Page",
    slug: "purchase-page",
    price: "$9,600",
    description: "Turn visitors into customers with a complete conversion flow.",
    bestFor: "Businesses selling a product, service, or program who need a multi-page flow from landing to checkout to post-purchase.",
    features: [
      "3–5 page conversion flow (landing → checkout entry → success page; optional FAQ or case study page)",
      "Payment provider integration (PayPal-ready setup; we configure once your account is active)",
      "Webhooks/automations spec for post-purchase workflows (Zapier, Make, or n8n)",
      "StrataMetrics funnel tracking: cta_click, form_start, form_submit, begin_checkout, purchase, thank_you_view",
      "Micro-interactions for premium feel",
      "Premium mobile-first UI/UX design",
      "Copy refinement across all pages",
      "Core Web Vitals optimization (LCP <2.5s, CLS <0.1, INP <200ms)",
      "14-day post-launch support (bug fixes and minor adjustments)",
      "Unlimited revisions",
    ],
    deliverables: {
      pages: "3–5 pages",
      tracking: "StrataMetrics funnel events (6 events)",
      trackedEvents: 6,
      integrations: "Payment + webhooks spec",
      revisions: "Unlimited",
    },
    delivery: "14–21 business days",
    cta: "Build My Purchase Flow",
    highlighted: false,
  },
] as const;

// Pricing FAQ
export const pricingFAQ = [
  {
    question: "Do I need to get on a call?",
    answer: "No. We're 100% async. You fill out the brief, we send a proposal within 24 hours. During the build, you get a dedicated chat in your client portal — message us anytime. We share progress through Loom walkthroughs. No scheduling. No timezone juggling.",
  },
  {
    question: "How do we communicate during the project?",
    answer: "Through your client portal. After deposit, you get direct chat access to the person building your page. Send feedback, ask questions, request changes. We respond within a few hours on business days.",
  },
  {
    question: "What do you need from me to start?",
    answer: "Your logo, brand colors, and details about your offer and audience. The brief walks you through everything — most clients finish it in 10 minutes.",
  },
  {
    question: "How long until my page is live?",
    /* DERIVED, not retyped. This sentence used to say "10–14 days" and
       "14–21 days" while the tiers below say "10–14 BUSINESS days" and
       "14–21 BUSINESS days" — the same answer, in the same file, quietly
       promising a delivery about 40% sooner than the contract. A buyer reads
       calendar days and holds you to them. */
    answer: `Presence Page: ${pricing[0].delivery}. Lead Page: ${pricing[1].delivery}. Purchase Page: ${pricing[2].delivery}. Clock starts when you approve the proposal and pay the deposit.`,
  },
  {
    question: "What if I don't like the direction?",
    answer: "You review at two checkpoints before anything goes live. Checkpoint 1: wireframe and messaging. Checkpoint 2: full build with tracking. You give feedback at each stage, and we revise until it's right.",
  },
  {
    question: "How do revisions work?",
    answer: "Presence Page includes 6 revision rounds. Lead and Purchase Pages include unlimited rounds. Each round covers all your feedback at once — submit everything together, we address it all.",
  },
  {
    question: "Do I own the code and design?",
    answer: "Yes. After final payment, everything is yours — code, design, assets. No licensing fees. No monthly charges. No strings.",
  },
  {
    question: "Can you deploy it and connect my domain?",
    answer: "Yes. We deploy to Vercel or Netlify, connect your custom domain, and verify everything works. Or we hand off the code if your team prefers to manage hosting.",
  },
  {
    question: "Will you integrate with my existing tools?",
    answer: "Yes. HubSpot, Mailchimp, ConvertKit, Klaviyo, Calendly, Cal.com, Typeform, Google Sheets, Zapier, PayPal — list your tools in the brief and we'll confirm what's included in the proposal.",
  },
  {
    question: "How fast will my page load?",
    /* "ahead of 90%+ of websites" was an unsourced percentile. The three
       thresholds ARE the claim, they are in trustBadges and in every tier's
       feature list, and they are labelled targets everywhere else. */
    answer: "Fast. We build with Next.js and target LCP under 2.5s, INP under 200ms and CLS under 0.1. Every page is tested on real devices before launch.",
  },
  {
    question: "What about SEO?",
    answer: "Technical SEO is built in — meta tags, Open Graph, structured data, semantic HTML, sitemap. We don't run SEO campaigns, but the foundation is done right.",
  },
  {
    question: "What's NOT included?",
    answer: "Ad management. Social media. Email campaigns. Ongoing retainers. We build landing pages — design, code, integrations, tracking — and hand them off. That's the scope.",
  },
] as const;

// Scope note
export const scopeNote = {
  title: "Scope & Change Requests",
  content: "All plans are fixed-scope. The deliverables listed above are exactly what's included—no more, no less. Requests outside the agreed scope (additional pages, new features, integrations not specified, extra revision rounds) are quoted and billed separately. If scope changes mid-project, we adjust the timeline and confirm the updated cost in writing before continuing. This keeps projects predictable for both sides.",
} as const;

// What We Build - deliverables focused
export const whatWeBuild = [
  {
    title: "Landing Page UI/UX",
    description: "Premium, conversion-ready layout that guides visitors to action. Mobile-first, fast, accessible.",
    icon: "design",
  },
  {
    title: "Landing Page Messaging",
    description: "Headlines, section copy, and CTAs structured for clarity and conversion. Not generic filler.",
    icon: "copy",
  },
  {
    title: "High-Performance Build",
    description: "Next.js + TypeScript + Tailwind. Clean code, fast loads, easy to maintain and extend.",
    icon: "code",
  },
  {
    title: "Core Web Vitals",
    description: "LCP <2.5s, CLS <0.1, INP <200ms. Performance targets baked into every build.",
    icon: "speed",
  },
  {
    title: "Forms + Integrations",
    description: "HubSpot, Mailchimp, Calendly, PayPal, Zapier—we handle the implementation.",
    icon: "integrations",
  },
  {
    title: "Tracking + Measurement",
    description: "Built-in event tracking, conversion tracking, scroll depth. Know what's working from day one.",
    icon: "analytics",
  },
] as const;

// ── "Goal Router" — buyer self-qualification by OUTCOME ──
// Each buyer JOB maps to a plan by OUTCOME only — NO prices live here (H10 Pricing owns cost).
// CONTRACT: the four `goal` values below MUST stay identical to `demoGoals` values and the live
// /demos?goal= filter (src/app/demos/page.tsx). Editing one requires editing both.
export const goalRouter = [
  {
    goal: "calls",
    label: "Book calls",
    description: "Discovery calls, consultations, demos",
    outputEyebrow: "Your page: Lead Page",
    outcomeHeadline: "Turn visitors into booked conversations.",
    artifact:
      "A landing page + thank-you page, with a contact form wired to your calendar or CRM — every click and submit tracked.",
    demoHref: "/demos?goal=calls",
    specs: ["2 pages", "Unlimited revisions", pricing[1].delivery],
  },
  {
    goal: "emails",
    label: "Collect emails",
    description: "Waitlists, newsletters, lead magnets",
    outputEyebrow: "Your page: Lead Page",
    outcomeHeadline: "Turn visitors into a list you own.",
    artifact:
      "A landing + thank-you page with a lead form connected to your email tool — every signup tracked.",
    demoHref: "/demos?goal=emails",
    specs: ["2 pages", "Unlimited revisions", pricing[1].delivery],
  },
  {
    goal: "sales",
    label: "Sell products",
    description: "E-commerce, courses, digital products",
    outputEyebrow: "Your page: Purchase Page",
    outcomeHeadline: "Turn visitors into paying customers.",
    artifact:
      "A 3–5 page flow — landing → checkout → success — with payment and post-purchase automation wired in.",
    demoHref: "/demos?goal=sales",
    specs: ["3–5 pages", "Unlimited revisions", pricing[2].delivery],
  },
  {
    goal: "quotes",
    label: "Request quotes",
    description: "Service inquiries, estimates, RFQs",
    outputEyebrow: "Your page: Lead Page",
    outcomeHeadline: "Turn visitors into qualified quote requests.",
    artifact:
      "A landing + thank-you page with a quote/inquiry form routed straight to your inbox.",
    demoHref: "/demos?goal=quotes",
    specs: ["2 pages", "Unlimited revisions", pricing[1].delivery],
  },
] as const;

// Default-active key on load — Lead Page is the highlighted/recommended tier.
export const goalRouterDefault = "emails";

// "Every build includes —" reassurance strip (plain-English, jargon-free; the completeness story
// the old 6-card grid used to carry, now demoted under the router).
export const goalRouterIncludes = [
  "A premium, mobile-first design",
  "Words written to convert, not filler",
  "Built to load fast so visitors don't bounce",
  "Your forms + email/CRM wired up for you",
  "Tracking so you can see what's working",
] as const;
export const goalRouterIncludesClose =
  "And you approve the finished page before you pay the balance.";

/**
 * THE GUARANTEE — the single strongest thing this studio can say, in one place.
 *
 * The pieces already existed here, but scattered: the review-before-balance line
 * lived in `goalRouterIncludesClose`, and the two checkpoints lived inside a FAQ
 * answer. Nothing stated the PAIR as a unit — which is the form that actually
 * works. Stated together they collapse "what if I don't like it" into "you
 * approve twice, and the balance is only due after you have seen it finished."
 *
 * Why this matters more than any other copy on the site: the buyer is a med spa
 * or a clinic, and their number one objection is not price, it is
 *   "the last web guy took my money and disappeared."
 * That fear is answered by structure, not by adjectives — and this structure is
 * real, so saying it costs nothing and proves everything.
 *
 * Every surface reads from here. One definition means the promise cannot drift
 * between the hero, the pricing ledger and the proposal — and if the payment
 * terms ever change, they change once.
 *
 * ⚠️ Everything below must stay literally true of the delivered process. It is
 * not marketing copy; it is a description of the contract.
 */
export const guarantee = {
  /** The two review gates, named. Matches the process + FAQ answer above. */
  checkpoints: [
    {
      n: "01",
      title: "Wireframe and messaging",
      body: "You see the structure and the words before a single pixel gets built. Revise until it reads right.",
    },
    {
      n: "02",
      title: "The finished build",
      body: "You review the complete page, tracking already installed, while it is still ours to fix.",
    },
  ],
  /** The payment structure, as a fear-killer rather than a policy note. */
  terms: "Half to begin. Half only after you have approved the finished page.",
  /** One line, for CTA microcopy and tight spaces. */
  short: "Two approvals. The balance is only due after you have seen it finished.",
  /** The pre-revenue position, said plainly — a trust accelerant, not a
   *  confession. DELIBERATELY UNRENDERED on the homepage: it is the right
   *  paragraph for /about, and the homepage is being shortened, not lengthened.
   *  Receipts already states the honest worst case in its own voice. Not an
   *  orphan by accident — leave it here, or move it to /about. */
  honesty:
    "We are a new studio building our first wins. That is exactly why your project gets obsessive attention, why the price is fixed before we start, and why you approve everything twice before the balance is due.",
} as const;

/**
 * THE HANDOFFS — one quiet exit from each section where intent actually peaks.
 *
 * The homepage runs about 48 viewports and, measured, eleven of its seventeen
 * sections carried nothing clickable: roughly 30 viewports in which a visitor
 * who had just been convinced had no way to act on it. That is the momentum law
 * broken at scale — and the worst offender was the worksheet, where the reader
 * computes, from their own four numbers, what they lose every month, and then
 * meets a disclaimer.
 *
 * The fix is deliberately NOT a button in all eleven. `system`, `manifesto`,
 * `spine`, `watching` and `marquee` are mid-argument, and interrupting a
 * build-up to sell is what makes a page feel needy. These six are the beats
 * where the argument has just closed.
 *
 * Each entry is a `line` (what the reader has just earned the right to do, in
 * the page's ledger voice) and a `location` — the analytics `cta_location`, so
 * the contribution of every handoff is separately measurable rather than
 * collapsing into one anonymous "somewhere in the middle" bucket.
 *
 * The label is never written here: it is always `cta.primary.label`, because
 * one label sitewide is the law.
 */
export const handoffs = {
  math: {
    line: "That gap is a monthly number. Tell us your four inputs and the proposal comes back priced against them.",
    location: "math",
  },
  journey: {
    line: "That is the whole product, end to end. Yours takes one brief and no meetings.",
    location: "what_we_build",
  },
  proof: {
    /* This said "you approve the first two before the build starts", which
       conflated the five LAYERS with the two CHECKPOINTS — and checkpoint 02
       is explicitly AFTER the build ("while it is still ours to fix"). A
       reader heard "I sign off twice before you build", which is not the
       contract. Only checkpoint 01 precedes the build; say that. */
    line: "Five layers, every build. You approve the structure and the words before any of them get built.",
    location: "proof",
  },
  process: {
    /* Carried "none of them a meeting" — which this section's own h2 says at
       52px — and "about ten minutes", which its closing panel now says. A
       handoff repeating the two loudest lines above it adds nothing. */
    line: "Step one is the brief. Everything after it is ours.",
    location: "how_it_works",
  },
  receipts: {
    /* "Judge the work" came out — the section's lede already says "open them
       and judge for yourself" directly over the links, which is the only place
       the instruction can be acted on. Three sayings of it in one section read
       as pleading. */
    line: "One client, and the archive under it. The next row on that ledger is yours.",
    location: "testimonials",
  },
  refusal: {
    line: "If your project is not on that list, the proposal comes back within 24 hours.",
    location: "refusal",
  },
} as const;

// Persistent tertiary for the lowest-intent buyer (no demoGoals token exists for pure credibility).
export const goalRouterPresence = {
  text: "Just need to look credible — no form yet? That's a Presence Page.",
  linkLabel: "See an example →",
  href: "/demos",
} as const;

// Process steps - No calls required, with timeline
export const process = [
  {
    step: 1,
    title: "Choose a Demo",
    description: "Find a starting point that fits your goal.",
    timeline: "5 min",
  },
  {
    step: 2,
    title: "Submit the Brief",
    description: "Async brief with your offer details and goals.",
    timeline: "10 min",
  },
  {
    step: 3,
    title: "Complete Interview",
    description: "AI deep dive into your brand, audience, and goals.",
    timeline: "15 min",
  },
  {
    step: 4,
    title: "Get Proposal",
    description: "Fixed proposal with scope, timeline, and price.",
    timeline: "24 hours",
  },
  {
    step: 5,
    title: "Review & Revise",
    description: "Wireframe, messaging, then final build + tracking.",
    timeline: "See package",
  },
  {
    step: 6,
    title: "Launch",
    description: "Deploy, tracking setup, and post-launch support.",
    timeline: "1 day",
  },
] as const;

// Trust-safe proof - verifiable only
export const trustBadges = [
  { value: "<2.5s", label: "Target LCP" },
  { value: "<200ms", label: "Target INP" },
  { value: "<0.1", label: "Target CLS" },
  { value: "100%", label: "Mobile-first" },
] as const;

// NOTE: the old `sampleResults` export was removed (2026-06-04). It presented invented
// metrics (+340% conversion, +89% mobile) as "representative results from similar projects"
// — a fabrication for a 0-client studio. Proof (H2) now leads with honest risk-reversal.

export const planLabels: Record<string, string> = {
  "presence-page": "Presence Page",
  "lead-page": "Lead Page",
  "purchase-page": "Purchase Page",
};

export const planSlugToPackage: Record<string, string> = {
  "presence-page": "starter",
  "lead-page": "growth",
  "purchase-page": "scale",
};

export const packageToPlanSlug: Record<string, string> = {
  "starter": "presence-page",
  "growth": "lead-page",
  "scale": "purchase-page",
};

// Included vs Not Included - clarity
export const scopeClarity = {
  included: [
    "Landing page UI/UX design",
    "Landing page messaging (headlines, sections, CTAs)",
    "Next.js development",
    "Performance optimization",
    "Forms + integrations",
    "Tracking + measurement setup",
  ],
  notIncluded: [
    "Ads management",
    "Campaign management",
    "Social media",
    "Long-term SEO programs",
    "Ongoing retainers",
  ],
} as const;

// Demo goals for filtering
export const demoGoals = [
  { label: "All", value: "all" },
  { label: "Book Calls", value: "calls", description: "Discovery calls, consultations, demos" },
  { label: "Collect Emails", value: "emails", description: "Waitlists, newsletters, lead magnets" },
  { label: "Sell Products", value: "sales", description: "E-commerce, courses, digital products" },
  { label: "Request Quotes", value: "quotes", description: "Service inquiries, estimates, RFQs" },
] as const;
