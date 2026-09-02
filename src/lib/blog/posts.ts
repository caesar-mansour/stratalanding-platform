// Blog post data — static for now, can migrate to DB later

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  author: string;
  publishedAt: string;
  updatedAt?: string;
  category: string;
  tags: string[];
  readingTime: number;
  featured: boolean;
}

export const blogCategories = [
  "Strategy",
  "Design",
  "Development",
  "Industry",
  "Guides",
] as const;

export const blogPosts: BlogPost[] = [
  {
    slug: "what-makes-high-converting-landing-page-2026",
    title: "What Makes a High-Converting Landing Page in 2026",
    description:
      "The anatomy of landing pages that actually convert. From hero sections to CTAs, here's what separates high-performers from the rest.",
    content: `
## The 7 Elements Every High-Converting Landing Page Needs

Most landing pages fail because they try to do too much. The best ones are ruthlessly focused on a single outcome.

After building hundreds of landing pages, here's what we've learned actually moves the needle.

### 1. One Clear Value Proposition

Your hero section gets 5 seconds. If visitors can't answer "what is this and why should I care?" in that time, they're gone.

**What works:** A headline that states the outcome, not the process. "Get 3x More Demo Requests" beats "AI-Powered Marketing Platform."

### 2. Social Proof Above the Fold

Trust signals need to appear before the scroll. Logos, review counts, or a single powerful stat.

### 3. Benefit-Driven Sections (Not Feature Lists)

Nobody cares that you have "real-time analytics." They care that they'll "know which campaigns are working before lunch."

### 4. Friction-Free Forms

Every field you add costs you conversions. Name + email is enough for most lead gen pages. Ask for more later.

### 5. Performance That Doesn't Punish

A 1-second delay in page load reduces conversions by 7%. Core Web Vitals aren't vanity metrics — they're revenue metrics.

- **LCP under 2.5 seconds** — your main content loads fast
- **CLS under 0.1** — nothing jumps around while loading
- **INP under 200ms** — interactions feel instant

### 6. Mobile-First Design

60%+ of traffic is mobile. If your landing page looks great on desktop but cramped on a phone, you're losing the majority of your visitors.

### 7. A Single, Repeated CTA

One action. One button style. Repeated 2-3 times throughout the page. Don't give visitors a choice between "Learn More," "Watch Demo," and "Contact Sales."

## The Bottom Line

Conversion isn't about tricks. It's about clarity, speed, and removing every reason someone might hesitate. Build for the visitor, not your ego.

---

*Need a landing page that follows these principles? [Start your project brief](/brief) — proposal in 24 hours, no calls needed.*
    `.trim(),
    author: "StrataLanding",
    publishedAt: "2026-02-20",
    category: "Strategy",
    tags: ["conversion", "design", "best practices"],
    readingTime: 5,
    featured: true,
  },
  {
    slug: "landing-page-vs-website",
    title: "Landing Page vs Website: Which Does Your Business Need?",
    description:
      "A landing page and a website serve different purposes. Here's how to decide which one you need — and when you need both.",
    content: `
## The Core Difference

A **website** is your digital home. It has multiple pages, navigation, and serves many audiences.

A **landing page** is a single page with one job: convert a specific visitor into a specific action.

### When You Need a Landing Page

- Running paid ads (Google, Meta, LinkedIn)
- Launching a product or feature
- Promoting a specific offer or event
- Testing a new market or message
- Capturing leads for a specific service

### When You Need a Website

- Establishing your brand's online presence
- Serving multiple audiences with different needs
- Building long-term organic traffic through content
- Providing customer support and resources

### When You Need Both

Most businesses need both. Your website builds authority and handles organic traffic. Your landing pages handle campaigns and specific conversion goals.

**The mistake:** Sending paid traffic to your homepage. Homepages serve everyone, which means they're optimized for no one.

**The fix:** Dedicated landing pages for each campaign, each audience, each offer.

## The Numbers

- Landing pages convert at 2-5x the rate of general website pages
- Companies with 30+ landing pages generate 7x more leads than those with fewer than 10
- The average landing page conversion rate is 5.89% (vs. 2.35% for websites)

## What to Do

If you're spending money on ads, you need landing pages. Period. Sending paid traffic to a general website is like paying for a billboard that says "we do stuff."

---

*Ready to build a landing page that converts? [Browse our 700+ demos](/demos) to find your starting point.*
    `.trim(),
    author: "StrataLanding",
    publishedAt: "2026-02-21",
    category: "Strategy",
    tags: ["landing pages", "websites", "strategy"],
    readingTime: 4,
    featured: false,
  },
  {
    slug: "landing-page-examples-by-industry",
    title: "50 Landing Page Examples by Industry [2026 Gallery]",
    description:
      "Browse 50 landing page examples across healthcare, SaaS, ecommerce, services, and more. See what high-converting pages look like in your industry.",
    content: `
## Landing Page Examples That Actually Convert

We've curated 50 landing page examples across the industries we build for most. Each one demonstrates a specific conversion pattern that works.

### Healthcare (10 Examples)

Healthcare pages need trust above everything. Certifications, provider photos, and insurance acceptance signals are mandatory.

- [Dental Practice](/demos) — Appointment booking with insurance info
- [Chiropractor](/demos) — Treatment-focused with patient testimonials
- [Med Spa](/demos) — Before/after gallery with treatment packages
- [Therapy Practice](/demos) — Warm, calming design with specialties
- [Veterinary Clinic](/demos) — Pet-friendly design with emergency info

### SaaS & Tech (10 Examples)

SaaS pages need to communicate value fast. Free trials, demo requests, and clear feature differentiation win.

- [AI Tool](/demos) — Feature demo with free trial CTA
- [CRM Platform](/demos) — Integration-focused with social proof
- [Analytics Dashboard](/demos) — Data visualization showcase
- [Project Management](/demos) — Team collaboration features
- [Email Marketing](/demos) — ROI calculator with plans

### Ecommerce & Products (10 Examples)

Product pages need visuals, urgency, and seamless checkout. Trust badges and reviews are conversion drivers.

- [Skincare Brand](/demos) — Ingredient-focused with reviews
- [Coffee Subscription](/demos) — Taste profile quiz funnel
- [Fitness Equipment](/demos) — Comparison tables with financing
- [Candle Brand](/demos) — Seasonal collections with gifting
- [Sneaker Release](/demos) — Limited edition with countdown

### Professional Services (10 Examples)

Service pages need credibility indicators: experience, case studies, and clear process explanations.

- [Accountant](/demos) — Industry-specific services with credentials
- [Law Firm](/demos) — Practice areas with case results
- [Financial Advisor](/demos) — Trust-forward with consultation booking
- [Business Consultant](/demos) — Case studies with strategy sessions
- [Insurance Agency](/demos) — Quote calculator with coverage options

### Home Services (10 Examples)

Local service pages need area coverage, emergency availability, and simple quote forms.

- [Plumbing & HVAC](/demos) — Emergency hero with service areas
- [Landscaping](/demos) — Portfolio gallery with seasonal packages
- [Electrician](/demos) — 24/7 emergency with licensing info
- [House Cleaning](/demos) — Package-based with instant booking
- [General Contractor](/demos) — Project portfolio with free estimates

---

*See the full gallery of 700+ demos at [stratalanding.com/demos](/demos). Find your industry, pick a starting point, and [submit your brief](/brief).*
    `.trim(),
    author: "StrataLanding",
    publishedAt: "2026-02-22",
    category: "Industry",
    tags: ["examples", "gallery", "industry"],
    readingTime: 7,
    featured: true,
  },
  {
    slug: "how-to-write-landing-page-copy",
    title: "How to Write Landing Page Copy That Converts",
    description:
      "Stop writing features. Start writing outcomes. A practical guide to landing page copy that turns visitors into leads and customers.",
    content: `
## The #1 Copy Mistake on Landing Pages

Most landing pages describe what the product does instead of what the customer gets. Features tell, benefits sell.

### The Outcome-First Framework

For every line of copy, ask: "So what?"

- ❌ "Real-time analytics dashboard"
- ✅ "Know which campaigns are working before lunch"

- ❌ "AI-powered lead scoring"
- ✅ "Stop wasting time on leads that will never buy"

- ❌ "24/7 customer support"
- ✅ "Get help the moment you need it, not when business hours resume"

### The Hero Section Formula

Your hero needs three things:

1. **Headline:** State the outcome in 8 words or fewer
2. **Subheadline:** Explain how in one sentence
3. **CTA:** One clear action

Example:
- **Headline:** "Get 3x More Qualified Leads"
- **Subheadline:** "Landing pages built for conversion, shipped in days."
- **CTA:** "Start Your Project Brief"

### Section Copy Rules

1. **Lead with the pain.** What's the problem your visitor is trying to solve?
2. **Present your solution.** Not your product — your solution to their problem.
3. **Prove it works.** Testimonials, numbers, case studies.
4. **Remove objections.** FAQ section that addresses the real hesitations.
5. **Ask for the action.** Clear CTA with microcopy that reduces risk.

### CTA Copy That Works

Forget "Submit" and "Click Here." Good CTAs:

- State the outcome: "Get My Free Audit"
- Reduce risk: "Start Free — No Credit Card"
- Create urgency: "Claim Your Spot (12 Left)"
- Be specific: "Download the 2026 Playbook"

### The 5-Second Test

Show your landing page to someone for 5 seconds. Then ask:
- What does this company do?
- What should I do next?
- Why should I care?

If they can't answer all three, rewrite your hero.

---

*Need help with your landing page copy? We refine headlines, sections, and CTAs as part of every project. [Start your brief](/brief).*
    `.trim(),
    author: "StrataLanding",
    publishedAt: "2026-02-23",
    category: "Strategy",
    tags: ["copywriting", "conversion", "headlines"],
    readingTime: 5,
    featured: false,
  },
  {
    slug: "how-much-does-landing-page-cost",
    title: "How Much Does a Landing Page Cost? [2026 Pricing Guide]",
    description:
      "Landing page costs range from $500 to $25,000+. Here's what affects the price and what you should actually pay based on your goals.",
    content: `
## Landing Page Pricing in 2026

The cost of a landing page depends on who builds it and what's included. Here's the honest breakdown.

### The Price Spectrum

| Option | Cost | What You Get |
|--------|------|-------------|
| DIY (Webflow, Wix) | $0-200/mo | Template, no strategy, your time |
| Freelancer | $500-3,000 | Design + basic development |
| Landing Page Studio | $2,000-10,000 | Design, dev, copy, tracking, integrations |
| Agency | $5,000-25,000+ | Full service with strategy, ads, ongoing |

### What Drives the Cost Up

1. **Number of pages** — A single page is simpler than a 5-page funnel
2. **Custom design vs. template** — Original designs cost more but convert better
3. **Integrations** — CRM, payment, email tool connections add complexity
4. **Copywriting** — Professional copy is a separate skill from design
5. **Tracking setup** — Event tracking, conversion funnels, analytics
6. **Revision rounds** — More rounds = more time = higher cost

### What You Should Actually Pay

- **Just need a presence?** $2,000-3,000 for a single page
- **Need to capture leads?** $4,000-6,000 for a page with forms and tracking
- **Need a full funnel?** $8,000-12,000 for multi-page with checkout

### The ROI Calculation

A landing page that generates 10 leads/month at a $500 customer value pays for itself in month one. The question isn't "can I afford it?" — it's "can I afford not to have one?"

### StrataLanding Pricing

We offer three fixed-scope packages:

- **Presence Page — $2,400** — 1 landing page, 6 revision rounds, 7-10 days
- **Lead Page — $4,800** — Landing + thank-you page, form integration, unlimited revisions
- **Purchase Page — $9,600** — 3-5 page funnel, payment integration, 14-day post-launch support

No hourly billing. No surprise invoices. [See full pricing](/pricing).

---

*Ready to invest in a landing page that pays for itself? [Start your project brief](/brief) — get a proposal in 24 hours.*
    `.trim(),
    author: "StrataLanding",
    publishedAt: "2026-02-24",
    category: "Guides",
    tags: ["pricing", "cost", "budget"],
    readingTime: 5,
    featured: true,
  },
];

// Helper functions
export function getAllPosts(): BlogPost[] {
  return blogPosts.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getFeaturedPosts(): BlogPost[] {
  return blogPosts.filter((p) => p.featured);
}

export function getPostsByCategory(category: string): BlogPost[] {
  return blogPosts.filter((p) => p.category === category);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((p) => p.slug);
}
