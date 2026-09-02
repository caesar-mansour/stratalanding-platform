"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  AnimatedSection,
  StaggerContainer,
  StaggerItem,
} from "@/components/motion/AnimatedSection";

const CASE_STUDIES = [
  {
    title: "VIP High Class: Luxury Chauffeur Service in Dubai",
    description:
      "A premium car service needed a dark-luxury landing page, designed to drive WhatsApp and phone bookings for weddings, airport transfers, and VIP events in Dubai.",
    slug: "vip-high-class",
    category: "Luxury Transport",
    metric: "1",
    metricLabel: "Page, designed and delivered",
    industry: "Transportation",
    timeline: "6 business days",
    package: "Lead Page",
    beforeMetric: "No site",
    afterMetric: "Delivered",
    client: "VIP High Class",
    siteUrl: "https://viphighclass.com",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3l14 9-14 9V3z" />
      </svg>
    ),
    gradient: "from-[#1a1a1a] to-[#D4AF37]",
  },
];

export default function CaseStudiesContent() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#E2E8F0]">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-[#0891B2]/[0.03] rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-[#0B1B3A]/[0.02] rounded-full blur-3xl" />
        </div>

        <div className="container pt-32 pb-20 relative z-10">
          <AnimatedSection animation="slideUp" delay={0.1}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0B1B3A]/5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-[#0891B2] rounded-full" />
              <span className="text-xs font-medium text-[#0B1B3A]/60 uppercase tracking-wider">
                Our Work
              </span>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="slideUp" delay={0.2}>
            <h1 className="text-5xl md:text-7xl font-black text-[#0B1B3A] mb-6 leading-[1.05] tracking-tight">
              Built by us.
              <br />
              <span className="text-accent">Shipped for them.</span>
            </h1>
          </AnimatedSection>

          <AnimatedSection animation="slideUp" delay={0.3}>
            <p className="text-lg md:text-xl text-[#475569] max-w-xl leading-relaxed">
              A real project built for a real business. Designed to turn
              visitors into enquiries, and shipped on a fixed timeline.
            </p>
          </AnimatedSection>

          {/* Stats strip */}
          <StaggerContainer
            className="flex flex-wrap gap-8 md:gap-14 mt-14 pt-8 border-t border-[#E2E8F0]"
            staggerDelay={0.06}
            delayChildren={0.4}
          >
            {[
              { value: "7-21", label: "Business Day Delivery" },
              { value: "<2.5s", label: "Target Page Load" },
              { value: "100%", label: "Mobile-First" },
              { value: "0", label: "Sales Calls Needed" },
            ].map((stat) => (
              <StaggerItem key={stat.label} animation="slideUp">
                <div>
                  <div className="text-3xl md:text-4xl font-black text-[#0B1B3A]">
                    {stat.value}
                  </div>
                  <div className="text-sm text-[#94A3B8] mt-0.5">{stat.label}</div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Case Study Cards */}
      <section className="container py-20 md:py-28">
        <div className="space-y-6 md:space-y-8">
          {CASE_STUDIES.map((study, idx) => (
            <motion.div
              key={study.slug}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Link href={`/case-studies/${study.slug}`} className="block group">
                <div className="relative rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden hover:border-[#CBD5E1] hover:shadow-lg transition-all duration-300">
                  <div className="grid md:grid-cols-12 gap-0">
                    {/* Left — Gradient panel */}
                    <div className={`md:col-span-4 bg-gradient-to-br ${study.gradient} p-8 md:p-10 flex flex-col justify-between min-h-[280px] relative overflow-hidden`}>
                      <div
                        className="absolute inset-0 opacity-[0.08]"
                        aria-hidden="true"
                        style={{
                          backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                          backgroundSize: "32px 32px",
                        }}
                      />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white">
                            {study.icon}
                          </div>
                        </div>
                        <p className="text-white/80 text-sm font-semibold">{study.client}</p>
                        <p className="text-white/40 text-xs mt-0.5">{study.category}</p>
                      </div>
                      <div className="relative z-10">
                        <div className="text-5xl md:text-6xl font-black text-white leading-none">
                          {study.metric}
                        </div>
                        <div className="text-white/60 text-sm font-medium mt-1">
                          {study.metricLabel}
                        </div>
                      </div>
                    </div>

                    {/* Right — Content */}
                    <div className="md:col-span-8 p-8 md:p-10 flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <span className="px-2.5 py-1 bg-[#F1F5F9] text-[#475569] text-xs font-medium rounded-md">
                            {study.industry}
                          </span>
                          <span className="px-2.5 py-1 bg-[#F1F5F9] text-[#475569] text-xs font-medium rounded-md">
                            {study.package}
                          </span>
                          <span className="text-xs text-[#94A3B8]">
                            Delivered in {study.timeline}
                          </span>
                        </div>

                        <h2 className="text-2xl md:text-3xl font-bold text-[#0B1B3A] mb-3 leading-tight group-hover:text-accent transition-colors duration-200">
                          {study.title}
                        </h2>

                        <p className="text-[#64748B] leading-relaxed max-w-lg">
                          {study.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#F1F5F9]">
                        {/* Before / After */}
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-medium">Before</p>
                            <p className="text-lg font-bold text-[#CBD5E1] line-through decoration-[#EF4444]/40">
                              {study.beforeMetric}
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <div>
                            <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-medium">After</p>
                            <p className="text-lg font-bold text-[#0B1B3A]">
                              {study.afterMetric}
                            </p>
                          </div>
                        </div>

                        {/* Visit + Read */}
                        <div className="flex items-center gap-4">
                          <a
                            href={study.siteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-[#94A3B8] hover:text-[#0B1B3A] text-sm font-medium transition-colors"
                          >
                            Visit Site
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          <div className="flex items-center gap-2 text-accent font-semibold text-sm group-hover:gap-3 transition-all duration-200">
                            Read More
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#E2E8F0]">
        <div className="container py-24 md:py-32 text-center">
          <AnimatedSection animation="slideUp">
            <p className="text-sm text-accent font-medium uppercase tracking-wider mb-4">
              Ready to grow?
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-[#0B1B3A] mb-5 leading-tight">
              Your landing page is next.
            </h2>
            <p className="text-[#64748B] max-w-md mx-auto mb-10 text-lg">
              Get a proposal within 24 hours. Fixed scope, fixed price,
              no calls required.
            </p>
            <Link href="/brief">
              <Button variant="gradient" size="lg">
                Start Your Project Brief
              </Button>
            </Link>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
