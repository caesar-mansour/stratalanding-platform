"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import Link from "next/link";
import { cta } from "@/lib/brand";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { trackCtaClick } from "@/lib/analytics";

interface PricingDetailProps {
  name: string;
  price: string;
  delivery: string;
  description: string;
  bestFor: string;
  features: string[];
  deliverables: {
    pages: string;
    tracking: string;
    integrations: string;
    revisions: string;
  };
  ctaText: string;
  highlighted?: boolean;
  planSlug?: "presence-page" | "lead-page" | "purchase-page";
}

export function PricingDetail({
  name,
  price,
  delivery,
  description,
  bestFor,
  features,
  deliverables,
  ctaText,
  highlighted = false,
  planSlug,
}: PricingDetailProps) {
  const prefersReducedMotion = useReducedMotion();

  const handleCtaClick = () => {
    trackCtaClick("pricing_detail", "primary", "brief", "home");
  };

  return (
    <div className="py-16 md:py-20">
      <div className="container max-w-4xl">
        {/* Back link */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to pricing
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          {highlighted && (
            <span className="inline-block px-3 py-1 bg-accent text-white text-xs font-semibold rounded-full mb-4">
              Most Popular
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-3">{name}</h1>
          <p className="text-lg text-text-muted mb-6">{description}</p>

          <div className="flex flex-wrap items-baseline gap-4">
            <span className="text-4xl md:text-5xl font-bold text-primary">{price}</span>
            <span className="text-text-muted">· {delivery}</span>
          </div>
        </motion.div>

        {/* Best For */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-10 p-5 bg-accent/5 rounded-xl border border-accent/10"
        >
          <h2 className="text-sm font-semibold text-accent mb-2">Best for</h2>
          <p className="text-text-muted">{bestFor}</p>
        </motion.div>

        {/* Deliverables Summary */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-10"
        >
          <h2 className="text-xl font-semibold text-primary mb-4">Deliverables</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs font-medium text-text-muted">Pages</span>
              </div>
              <p className="text-sm font-semibold text-primary">{deliverables.pages}</p>
            </div>
            <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-xs font-medium text-text-muted">Tracking</span>
              </div>
              <p className="text-sm font-semibold text-primary">{deliverables.tracking}</p>
            </div>
            <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="text-xs font-medium text-text-muted">Integrations</span>
              </div>
              <p className="text-sm font-semibold text-primary">{deliverables.integrations}</p>
            </div>
            <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-xs font-medium text-text-muted">Revisions</span>
              </div>
              <p className="text-sm font-semibold text-primary">{deliverables.revisions}</p>
            </div>
          </div>
        </motion.div>

        {/* What's Included */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-10"
        >
          <h2 className="text-xl font-semibold text-primary mb-4">What&apos;s included</h2>
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <motion.li
                key={index}
                initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.25 + index * 0.03 }}
                className="flex items-start gap-3"
              >
                <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-text-muted">{feature}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Explore Demos */}
        {planSlug && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mb-10 p-5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]"
          >
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-primary mb-1">See it in action</h3>
                <p className="text-sm text-text-muted">Browse landing page templates compatible with this plan</p>
              </div>
              <Link href={`/demos?plan=${planSlug}`}>
                <Button variant="secondary" size="md">
                  <span className="flex items-center gap-2">
                    Explore Compatible Demos
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="pt-6 border-t border-[#E2E8F0]"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <p className="text-sm text-text-muted mb-1">Ready to get started?</p>
              <p className="text-lg font-semibold text-primary">{price} · {delivery}</p>
            </div>
            <Link href={cta.primary.href} onClick={handleCtaClick}>
              <Button variant="gradient" size="lg">{ctaText}</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
