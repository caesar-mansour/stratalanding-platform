"use client";

import { useState, useMemo, useCallback, useRef, useEffect, useDeferredValue, memo } from "react";
import { motion } from "framer-motion";
import { Card, Badge, Button, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { DemoCardPreview } from "@/components/demos/DemoCardPreview";
import dynamic from "next/dynamic";
import type { DemoData, SourceRect } from "@/components/sections/DemoPreviewExpandModal";
import { cta, demoGoals, planLabels, planSlugToPackage, packageToPlanSlug, templatePricing } from "@/lib/brand";
import { trackDemoView, trackCtaClick } from "@/lib/analytics";
import { useSearchParams } from "next/navigation";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { Suspense } from "react";

// Lazy load heavy modal — only needed when user clicks preview
const DemoPreviewExpandModal = dynamic(
  () => import("@/components/sections/DemoPreviewExpandModal").then(m => ({ default: m.DemoPreviewExpandModal })),
  { ssr: false }
);


// Demo data with goal-based structure
export const demos = [
  { id: "local-service-leads", title: "Cosmetic Clinic", subtitle: "Lead Generation", description: "High-converting lead generation page for a premium cosmetic clinic with trust-building social proof.", tag: "Healthcare", category: "Healthcare", href: "/demos/local-service-leads", goal: "quotes", goalLabel: "Request Quotes", bestFor: "Healthcare, Beauty, Local Services", keySections: ["Hero with CTA", "Services Grid", "Before/After", "Testimonials", "FAQ", "Contact Form"], plan: "lead-page" },
  { id: "saas-waitlist", title: "SaaS Waitlist", subtitle: "Product Launch", description: "Early access waitlist for a new SaaS product.", tag: "SaaS", category: "SaaS", href: "/demos/saas-waitlist", goal: "emails", goalLabel: "Join Waitlist", bestFor: "Tech Startups, Product Launches", keySections: ["Hero with Waitlist", "Feature Preview", "Problem/Solution", "Early Access Benefits", "Social Proof"], plan: "lead-page" },
  { id: "agency-niche", title: "Agency Niche", subtitle: "Beauty Salon Marketing", description: "Agency service page for beauty salon marketing.", tag: "Agency", category: "Agency", href: "/demos/agency-niche", goal: "calls", goalLabel: "Book Calls", bestFor: "Agencies, Consultants", keySections: ["Niche Hero", "Case Studies", "Process", "Pricing", "Calendly Embed"], plan: "lead-page" },
];

// Additional demos loaded dynamically after first paint
type DemoItem = typeof demos[number];

// Goal filter mapping
const goalFilterMap: Record<string, string> = {
  calls: "calls",
  emails: "emails",
  sales: "sales",
  quotes: "quotes",
};


// Industry filter options
const industries = [
  { value: "all", label: "All Industries" },
  { value: "healthcare", label: "Healthcare", keywords: ["healthcare", "dental", "clinic", "therapy", "cosmetic", "chiropractor", "optometrist", "dermatologist", "pediatrician", "fertility", "veterinary", "plastic surgery", "orthodontist", "acupuncture", "speech", "nutritionist", "wellness", "med spa"] },
  { value: "tech", label: "Tech & SaaS", keywords: ["saas", "app", "mobile", "tech", "startup", "software", "ai", "crm", "api", "analytics", "cybersecurity", "hr software", "inventory", "marketplace", "dating app", "vr"] },
  { value: "services", label: "Professional Services", keywords: ["agency", "law", "financial", "insurance", "real estate", "consultant", "accountant", "tax", "immigration", "hr consultant", "executive coach", "staffing", "bookkeeping", "virtual assistant"] },
  { value: "gaming", label: "Gaming & Esports", keywords: ["esports", "gaming cafe", "game studio", "board game", "streaming", "tabletop rpg", "gaming peripheral", "esports arena", "game coaching", "retro gaming", "gaming chair", "miniature", "gaming tournament", "escape game"] },
];

const BATCH_SIZE = 8;

function DemosContent() {
  const searchParams = useSearchParams();
  const initialGoal = searchParams.get("goal") || "all";
  const planFilter = searchParams.get("plan") || null;
  const fromBrief = searchParams.get("from") === "brief";

  const [activeGoal, setActiveGoal] = useState(initialGoal);
  const [activeIndustry, setActiveIndustry] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);

  // Dynamic loading of additional demos
  const [extraDemos, setExtraDemos] = useState<DemoItem[]>([]);
  useEffect(() => {
    import("@/lib/additional-demos").then(m => setExtraDemos(m.additionalDemos));
  }, []);
  const allDemos = useMemo(() => [...demos, ...extraDemos], [extraDemos]);

  // Infinite scroll
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const reducedMotion = useReducedMotion();
  const [activeDemo, setActiveDemo] = useState<DemoData | null>(null);
  const [sourceRect, setSourceRect] = useState<SourceRect | null>(null);

  const handleOpenPreview = useCallback((demo: DemoItem, rect: SourceRect) => {
    setSourceRect(rect);
    setActiveDemo({
      id: demo.id,
      title: demo.title,
      subtitle: demo.subtitle,
      tag: demo.tag,
      industry: demo.category,
      goal: demo.goal,
      href: demo.href,
      desktopImg: "",
      mobileImg: "",
    });
  }, []);

  const handleClosePreview = useCallback(() => {
    setActiveDemo(null);
  }, []);

  // Filter demos
  const filteredDemos = useMemo(() => {
    let filtered = allDemos;

    // Apply plan filter (from URL param)
    if (planFilter) {
      // Check if it's a package type (from brief) or plan slug (from demos page)
      const planSlug = packageToPlanSlug[planFilter] || planFilter;
      if (planLabels[planSlug]) {
        filtered = filtered.filter((demo) => demo.plan === planSlug);
      }
    }

    // Apply goal filter
    if (activeGoal !== "all") {
      filtered = filtered.filter((demo) => demo.goal === activeGoal);
    }

    // Apply industry filter
    if (activeIndustry !== "all") {
      const industry = industries.find((i) => i.value === activeIndustry);
      if (industry && 'keywords' in industry) {
        filtered = filtered.filter((demo) => {
          const demoText = `${demo.title} ${demo.subtitle} ${demo.bestFor} ${demo.category}`.toLowerCase();
          return industry.keywords?.some((keyword) => demoText.includes(keyword.toLowerCase()));
        });
      }
    }

    // Apply search filter (debounced via useDeferredValue)
    if (deferredSearch.trim()) {
      const query = deferredSearch.toLowerCase();
      filtered = filtered.filter(
        (demo) =>
          demo.title.toLowerCase().includes(query) ||
          demo.subtitle.toLowerCase().includes(query) ||
          demo.description.toLowerCase().includes(query) ||
          demo.bestFor.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allDemos, activeGoal, activeIndustry, deferredSearch, planFilter]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [activeGoal, activeIndustry, deferredSearch, planFilter]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount(c => Math.min(c + BATCH_SIZE, filteredDemos.length));
        }
      },
      { rootMargin: '400px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filteredDemos.length]);

  const handleDemoClick = (demo: typeof demos[0]) => {
    trackDemoView(demo.id, demo.goal);
  };

  const handleBuildLikeThis = () => {
    trackCtaClick("demo_card", "primary", "brief", "demos");
  };



  const handleClearAll = () => {
    setActiveGoal("all");
    setActiveIndustry("all");
    setSearchQuery("");
    if (planFilter) {
      window.location.href = "/demos";
    }
  };

  const handlePlanChange = (val: string) => {
    if (val === "all") {
      window.location.href = "/demos";
    } else {
      window.location.href = `/demos?plan=${val}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Brief Selection Banner */}
      {fromBrief && (
        <div className="bg-[#8B5CF6] text-white">
          <div className="container py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">
                {planFilter ? `Demos for your ${planLabels[packageToPlanSlug[planFilter] || planFilter] || 'selected'} plan` : 'Find a demo that matches your business'}
              </span>
            </div>
            <Link
              href={`/brief${planFilter ? `?plan=${planFilter}` : ''}`}
              className="text-sm text-white/80 hover:text-white transition-colors flex items-center gap-1"
            >
              Back to brief
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="bg-white border-b border-[#E2E8F0]">
        <div className="container py-12 md:py-16">
          <div className="max-w-3xl">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-sm font-medium text-[#0B1B3A]">Product Showroom</span>
            </motion.div>
            <motion.h1
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {fromBrief && planFilter
                ? `${planLabels[packageToPlanSlug[planFilter] || planFilter] || 'Demo'} Demos`
                : 'Demo Landing Pages'}
            </motion.h1>
            <motion.p
              className="text-lg text-[#334155] leading-relaxed"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {fromBrief && planFilter
                ? 'These demos are included with your selected plan. Pick one as inspiration for your project.'
                : 'Browse conversion-focused landing pages by goal. Each demo shows a different approach—find one that matches your business.'}
            </motion.p>
          </div>
        </div>
      </section>

      {/* Filter + Search + Grid */}
      <section className="py-10 md:py-12">
        <div className="container">
          {/* Filters Row */}
          <motion.div
            className="bg-white border border-[#E2E8F0] p-4 md:p-6 rounded-2xl shadow-sm mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col lg:flex-row gap-4 items-end lg:items-center">
              {/* Search */}
              <div className="flex-1 w-full relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, industry, or use case..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-10 py-3 border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#64748B] hover:text-[#334155]"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filters Dropdowns Group */}
              <div className="flex flex-wrap md:flex-nowrap gap-3 items-center w-full lg:w-auto">
                <div className="w-full sm:flex-1 md:w-48">
                  <Select
                    options={demoGoals}
                    value={activeGoal}
                    onChange={(e) => setActiveGoal(e.target.value)}
                    className="h-[50px]"
                  />
                </div>
                <div className="w-full sm:flex-1 md:w-56">
                  <Select
                    options={industries}
                    value={activeIndustry}
                    onChange={(e) => setActiveIndustry(e.target.value)}
                    className="h-[50px]"
                  />
                </div>
                {!fromBrief && (
                  <div className="w-full sm:flex-1 md:w-48">
                    <Select
                      options={[
                        { value: "all", label: "All Plans" },
                        { value: "presence-page", label: "Presence Page" },
                        { value: "lead-page", label: "Lead Page" },
                        { value: "purchase-page", label: "Purchase Page" }
                      ]}
                      value={planFilter || "all"}
                      onChange={(e) => handlePlanChange(e.target.value)}
                      className="h-[50px]"
                    />
                  </div>
                )}

                {/* Clear All Link */}
                {(activeGoal !== "all" || activeIndustry !== "all" || searchQuery || planFilter) && (
                  <button
                    onClick={handleClearAll}
                    className="whitespace-nowrap px-4 py-3 min-h-[44px] min-w-[44px] flex items-center text-sm font-medium text-[#0891B2] hover:text-[#0E7490] transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Plan Filter Banner */}
          {planFilter && planLabels[planFilter] && (
            <motion.div
              className="mb-6 p-4 bg-accent/5 border border-accent/20 rounded-xl flex items-center justify-between"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3">
                <span className="text-accent">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </span>
                <span className="text-sm text-primary">
                  Showing demos compatible with <span className="font-semibold">{planLabels[planFilter]}</span>
                </span>
              </div>
              <Link
                href="/demos"
                className="text-sm text-accent hover:underline font-medium"
              >
                View all demos
              </Link>
            </motion.div>
          )}

          {/* Results Count */}
          <motion.p
            className="text-sm text-[#334155] mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Showing {Math.min(visibleCount, filteredDemos.length)} of {filteredDemos.length} demos
            {searchQuery && ` matching "${searchQuery}"`}
            {activeGoal !== "all" && ` for "${demoGoals.find(g => g.value === activeGoal)?.label}"`}
            {activeIndustry !== "all" && ` in ${industries.find(i => i.value === activeIndustry)?.label}`}
          </motion.p>

          {/* Demo Grid — renders only visible batch */}
          <div className="grid lg:grid-cols-2 gap-5">
            {filteredDemos.slice(0, visibleCount).map((demo, index) => (
              <motion.div
                key={demo.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.4,
                  delay: (index % 2) * 0.08,
                  ease: [0.25, 0.1, 0.25, 1]
                }}
              >
                <Card
                  variant="default"
                  padding="none"
                  className="group overflow-hidden hover:shadow-xl hover:border-accent/30 transition-[box-shadow,border-color] duration-300 h-full"
                >
                  {/* Preview Area — click to expand modal */}
                  <PreviewButton demo={demo} onOpen={handleOpenPreview} />

                  {/* Content */}
                  <div className="p-5">
                    <h2 className="text-lg font-semibold text-[#0F172A] mb-0.5">
                      {demo.title}
                    </h2>
                    <p className="text-[#0E7490] font-medium text-sm mb-2">
                      {demo.subtitle}
                    </p>
                    <p className="text-[#334155] text-sm leading-relaxed mb-4 line-clamp-2">
                      {demo.description}
                    </p>

                    {/* Meta Info */}
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-[#0F172A] min-w-[70px]">Best for:</span>
                        <span className="text-[#334155]">{demo.bestFor}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-[#0F172A] min-w-[70px]">Sections:</span>
                        <span className="text-[#334155] text-xs">{demo.keySections.slice(0, 4).join(", ")}{demo.keySections.length > 4 && "..."}</span>
                      </div>
                    </div>

                    {/* CTAs */}
                    <div className="pt-4 border-t border-[#E2E8F0] flex flex-col gap-3">
                      <div className="flex gap-3">
                        <Link href={demo.href} onClick={() => handleDemoClick(demo)} className="flex-1">
                          <Button variant="secondary" size="sm" fullWidth>
                            View Demo
                          </Button>
                        </Link>
                        {fromBrief ? (
                          <Link
                            href={`/brief?demo=${demo.id}${planFilter ? `&plan=${planFilter}` : ''}`}
                            onClick={handleBuildLikeThis}
                            className="flex-1"
                          >
                            <Button size="sm" fullWidth className="bg-[#8B5CF6] hover:bg-[#7C3AED]">
                              Add to Brief
                            </Button>
                          </Link>
                        ) : (
                          <Link
                            href={`${cta.primary.href}?demo=${demo.id}&plan=${planSlugToPackage[demo.plan] || 'starter'}`}
                            onClick={handleBuildLikeThis}
                            className="flex-1"
                          >
                            <Button size="sm" fullWidth>
                              Build This
                            </Button>
                          </Link>
                        )}
                      </div>
                      {/* AUDIT 2026-08-12: repointed from the template checkout (which could not
                          take a payment, and priced from a user-editable ?plan= param) to the
                          studio brief. */}
                      {!fromBrief && (
                        <Link
                          href={`/brief?demo=${demo.id}&plan=${planSlugToPackage[demo.plan as keyof typeof planSlugToPackage] || 'starter'}`}
                          className="w-full"
                        >
                          <Button variant="gradient" size="sm" fullWidth className="font-semibold">
                            Get This Built For You
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Infinite scroll sentinel + loading indicator */}
          {visibleCount < filteredDemos.length && (
            <div ref={sentinelRef} className="flex items-center justify-center py-10 gap-3">
              <div className="w-5 h-5 border-2 border-[#0891B2]/30 border-t-[#0891B2] rounded-full animate-spin" />
              <span className="text-sm text-[#334155]">Loading more demos...</span>
            </div>
          )}

          {/* Empty State */}
          {filteredDemos.length === 0 && (
            <div className="text-center py-16">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-[#E2E8F0]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-[#334155] mb-4">
                No demos match your search. Try different keywords or filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveGoal("all");
                  setActiveIndustry("all");
                }}
                className="text-[#0891B2] font-medium hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-white border-t border-[#E2E8F0]">
        <div className="container text-center">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-[#0F172A] mb-3"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Found something you like?
          </motion.h2>
          <motion.p
            className="text-[#334155] mb-6 max-w-xl mx-auto"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Start with a demo as inspiration, or request a fully custom page.
            We&apos;ll respond within 24 hours with a proposal.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link href={cta.primary.href}>
              <Button size="lg">{cta.primary.label}</Button>
            </Link>
          </motion.div>
          <motion.p
            className="mt-4 text-sm text-[#334155]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            {cta.reassurance}
          </motion.p>
        </div>
      </section>
      <DemoPreviewExpandModal
        demo={activeDemo}
        sourceRect={sourceRect}
        onClose={handleClosePreview}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}

/* ─── Clickable preview wrapper ─── */
function PreviewButton({
  demo,
  onOpen,
}: {
  demo: typeof demos[0];
  onOpen: (demo: typeof demos[0], rect: SourceRect) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    const rect = ref.current?.getBoundingClientRect();
    onOpen(demo, rect
      ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      : { top: 0, left: 0, width: 0, height: 0 });
  };

  return (
    <div
      ref={ref}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      role="button"
      tabIndex={0}
      aria-label={`Preview ${demo.title}`}
      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-t-[inherit]"
    >
      <DemoCardPreview
        href={demo.href}
        title={demo.title}
        plan={demo.plan}
        goalLabel={demo.goalLabel}
      />
    </div>
  );
}

export default function DemosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <DemosContent />
    </Suspense>
  );
}
