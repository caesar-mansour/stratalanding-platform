"use client";

import { motion } from "framer-motion";
import { Button, Card } from "@/components/ui";
import { brand, cta, scopeClarity } from "@/lib/brand";
import { trackCtaClick } from "@/lib/analytics";
import Link from "next/link";
import { useReducedMotion } from "@/lib/useReducedMotion";

const values = [
  {
    title: "Clarity Over Cleverness",
    description:
      "Every word and design choice should make your offer easier to understand and act on. We write for clarity, not awards.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Speed That Doesn't Sacrifice",
    description:
      "We work efficiently because your campaigns can't wait. But fast doesn't mean sloppy—every deliverable meets our quality bar.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Performance First",
    description:
      "A beautiful page that loads slowly costs you conversions. We optimize for Core Web Vitals because speed directly affects your results.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: "Async by Default",
    description:
      "No discovery calls. No scheduling hassles. Loom updates at each checkpoint, plus direct chat access to our team throughout your project.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
];

// Simplified, performance-optimized transition
const smoothTransition = {
  duration: 0.4,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

export default function AboutContent() {
  const prefersReducedMotion = useReducedMotion();

  const handleCtaClick = () => {
    trackCtaClick("about_cta", "primary", "brief", "about");
  };

  const handleSecondaryClick = () => {
    trackCtaClick("about_cta", "secondary", "demos", "about");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="container py-16 md:py-24">
          <div className="max-w-3xl">
            <motion.span
              className="inline-block bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-4"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={smoothTransition}
            >
              About {brand.name}
            </motion.span>

            <motion.h1
              className="text-4xl md:text-5xl font-bold text-[#0F172A] mb-6"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...smoothTransition, delay: 0.1 }}
            >
              A Landing Page Studio.{" "}
              <span className="text-accent">That&apos;s It.</span>
            </motion.h1>

            <motion.p
              className="text-lg text-[#475569] leading-relaxed"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...smoothTransition, delay: 0.2 }}
            >
              We design and build landing pages. Premium UI/UX, clear copy, fast Next.js builds, and analytics setup—delivered async. No agency overhead. No bloated retainers. Just focused work on the pages that drive your business.
            </motion.p>
          </div>
        </div>
      </section>

      {/* What We Do / Don't Do */}
      <section className="section bg-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* What We Do */}
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={smoothTransition}
            >
              <h2 className="text-2xl md:text-3xl font-bold text-[#0F172A] mb-6">
                What We Build
              </h2>
              <ul className="space-y-4">
                {scopeClarity.included.map((item, index) => (
                  <motion.li
                    key={index}
                    className="flex items-start gap-3"
                    initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ ...smoothTransition, delay: index * 0.05 }}
                  >
                    <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[#475569]">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* What We Don't Do */}
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...smoothTransition, delay: 0.1 }}
            >
              <h2 className="text-2xl md:text-3xl font-bold text-[#0F172A] mb-6">
                What We Don&apos;t Do
              </h2>
              <ul className="space-y-4">
                {scopeClarity.notIncluded.map((item, index) => (
                  <motion.li
                    key={index}
                    className="flex items-start gap-3"
                    initial={prefersReducedMotion ? {} : { opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ ...smoothTransition, delay: index * 0.05 }}
                  >
                    <svg className="w-5 h-5 text-[#94A3B8] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-[#475569]">{item}</span>
                  </motion.li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-[#475569]">
                We build landing pages. That&apos;s our focus. For ads, campaigns, and ongoing marketing, work with specialists in those areas.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How We Work */}
      <section className="section bg-[#F8FAFC]">
        <div className="container">
          <motion.div
            className="text-center mb-12"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={smoothTransition}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
              How We Work
            </h2>
            <p className="text-lg text-[#475569] max-w-2xl mx-auto">
              Async by default. Clear deliverables. No surprise scope creep.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...smoothTransition, delay: index * 0.1 }}
              >
                <Card variant="default" padding="lg" className="h-full transition-shadow duration-300 hover:shadow-lg">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
                    {value.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-3">
                    {value.title}
                  </h3>
                  <p className="text-[#475569] leading-relaxed">
                    {value.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Process (Brief) */}
      <section className="section bg-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-6"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={smoothTransition}
            >
              Simple, Async Process
            </motion.h2>
            <motion.div
              className="text-lg text-[#475569] leading-relaxed space-y-4"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...smoothTransition, delay: 0.1 }}
            >
              <p>
                <strong className="text-[#0F172A]">1. You submit a brief.</strong> Tell us about your offer, audience, and goals. Takes about 10 minutes.
              </p>
              <p>
                <strong className="text-[#0F172A]">2. We send a proposal.</strong> Within 24 hours, you get a fixed-price quote with scope, timeline, and deliverables.
              </p>
              <p>
                <strong className="text-[#0F172A]">3. Two checkpoints.</strong> You review wireframe + copy, then final design + build. Revisions happen at each checkpoint.
              </p>
              <p>
                <strong className="text-[#0F172A]">4. We launch.</strong> Page goes live and tracking is set up. Post-launch support is included on the Purchase Page tier.
              </p>
            </motion.div>
            <motion.p
              className="mt-8 text-sm text-[#475569]"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ ...smoothTransition, delay: 0.2 }}
            >
              No discovery calls. No vague timelines. No scope surprises.
            </motion.p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#0B1B3A]">
        <div className="container text-center">
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-white mb-4"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={smoothTransition}
          >
            Ready to Start?
          </motion.h2>
          <motion.p
            className="text-lg text-white/70 mb-8 max-w-xl mx-auto"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...smoothTransition, delay: 0.1 }}
          >
            Submit your project brief and get a proposal within 24 hours.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...smoothTransition, delay: 0.2 }}
          >
            <Link href={cta.primary.href} onClick={handleCtaClick}>
              <Button variant="accent" size="lg" className="transition-transform duration-200 hover:scale-105 active:scale-95">
                {cta.primary.label}
              </Button>
            </Link>
            <Link href={cta.secondary.href} onClick={handleSecondaryClick}>
              <Button variant="ghost-light" size="lg" className="transition-transform duration-200 hover:scale-105 active:scale-95">
                {cta.secondary.label}
              </Button>
            </Link>
          </motion.div>
          <motion.p
            className="mt-6 text-sm text-white/50"
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ ...smoothTransition, delay: 0.3 }}
          >
            {cta.microcopy}
          </motion.p>
        </div>
      </section>
    </div>
  );
}
