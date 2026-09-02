'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import type { Proposal, PackageType, ProposalSections } from '@/lib/types';
import { packagePricing, formatPrice, getProposalPrice } from '@/lib/types';
import { trackBeginCheckout } from '@/lib/analytics';
import { pricing } from '@/lib/brand';

// Map internal package slugs to brand pricing data
const packageDetails: Record<PackageType, { name: string; features: string[]; delivery: string }> = {
  starter: {
    name: pricing[0].name,
    features: [...pricing[0].features],
    delivery: pricing[0].delivery,
  },
  growth: {
    name: pricing[1].name,
    features: [...pricing[1].features],
    delivery: pricing[1].delivery,
  },
  scale: {
    name: pricing[2].name,
    features: [...pricing[2].features],
    delivery: pricing[2].delivery,
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ProposalView({ proposal }: { proposal: Proposal }) {
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const isExpired = new Date(proposal.valid_until) < new Date();
  const isAccepted = proposal.status === 'accepted';
  const price = getProposalPrice(proposal);
  const deposit = price / 2;
  const packageInfo = packageDetails[proposal.package as PackageType];
  const sections: ProposalSections | null = proposal.proposal_sections || null;

  async function handleAcceptAndPay() {
    setPaymentLoading(true);
    setPaymentError(null);
    // AUDIT 2026-08-12 (P2): trackBeginCheckout existed with ZERO call sites, so the funnel had no
    // checkout step at all. Fired here — the moment the buyer commits — with the real deposit
    // value, so drop-off between "clicked pay" and "paid" becomes measurable.
    try {
      trackBeginCheckout(proposal.package as 'starter' | 'growth' | 'scale', deposit / 100);
    } catch { /* analytics must never block a payment */ }
    try {
      // Carry the signed proposal token from the emailed link so PayPal's return URL can
      // re-authorize the capture — the prospect paying a deposit is not logged in.
      const t = new URLSearchParams(window.location.search).get('t');
      const res = await fetch(`/api/proposals/${proposal.id}/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t }),
      });
      const data = await res.json();
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        setPaymentError(data.error || 'Failed to create payment. Please try again.');
        setPaymentLoading(false);
      }
    } catch {
      setPaymentError('Something went wrong. Please try again.');
      setPaymentLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--color-accent)]/5">
      {/* Header - matches portal styling exactly */}
      <motion.header
        className="bg-gradient-to-r from-[#E8F0F8] via-[#9ABCD8] to-[#3A6A8A] border-b border-[var(--color-accent)]/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-lg text-white flex items-center gap-3">
            <motion.div
              className="w-9 h-9 bg-[var(--color-accent)] rounded-xl flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/30"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </motion.div>
            <div className="flex flex-col">
              <span className="leading-tight">Your Proposal</span>
              <span className="text-xs text-white/60 font-normal">StrataLanding</span>
            </div>
          </Link>
          <motion.div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-white/80">{proposal.client_name}</span>
          </motion.div>
        </div>
      </motion.header>

      <main className="container py-12">
        <motion.div
          className="max-w-3xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Status Banner */}
          {(isExpired || isAccepted) && (
            <motion.div
              variants={itemVariants}
              className={`mb-6 p-4 rounded-lg text-center ${
                isAccepted
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {isAccepted ? (
                <p className="font-medium">This proposal has been accepted. Check your email for next steps.</p>
              ) : (
                <p className="font-medium">This proposal has expired. Please contact us for a new quote.</p>
              )}
            </motion.div>
          )}

          {/* Main Proposal Card */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl overflow-hidden border border-[var(--color-accent)]/20"
          >
            {/* Header Section */}
            <div className="bg-gradient-to-r from-[#E8F0F8] via-[#9ABCD8] to-[#3A6A8A] p-8">
              <motion.p
                className="text-[#1A3A5A]/80 text-sm mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Proposal for
              </motion.p>
              <motion.h1
                className="text-3xl font-bold mb-2 text-[#1A3A5A]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {proposal.company_name}
              </motion.h1>
              <motion.p
                className="text-[#1A3A5A]/80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Prepared for {proposal.client_name}
              </motion.p>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8">
              {/* Personalized Opener */}
              {sections?.opener && (
                <motion.div variants={itemVariants}>
                  <p className="text-[var(--text-primary)] text-base leading-relaxed">
                    {sections.opener}
                  </p>
                </motion.div>
              )}

              {/* What We Understood */}
              {sections?.understanding && (
                <motion.div variants={itemVariants}>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-[var(--color-accent)]/10 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    What We Understood
                  </h2>
                  <div className="bg-gradient-to-br from-[var(--background)] to-[var(--color-accent)]/5 rounded-xl p-6 border border-[var(--color-accent)]/10">
                    <ul className="space-y-3">
                      {sections.understanding.split('\n').filter(Boolean).map((line, i) => (
                        <li key={i} className="flex items-start gap-3 text-[var(--text-primary)] text-sm">
                          <svg className="w-4 h-4 text-[var(--color-accent)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span>{line.replace(/^[-•]\s*/, '')}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-[var(--text-muted)] mt-4 pt-3 border-t border-[var(--color-accent)]/10">
                      If any of this is off, reply to our email and we&apos;ll adjust before starting.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Why This Tier */}
              {sections?.tier_reasoning && (
                <motion.div variants={itemVariants}>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-[var(--color-accent)]/10 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    Why We Recommend This Tier
                  </h2>
                  <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                    {sections.tier_reasoning}
                  </p>
                </motion.div>
              )}

              {/* Package Selection */}
              <motion.div variants={itemVariants}>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-[var(--color-accent)]/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  {packageInfo.name} Package
                </h2>
                <div className="bg-gradient-to-br from-[var(--background)] to-[var(--color-accent)]/5 rounded-xl p-6 border border-[var(--color-accent)]/10">
                  <ul className="space-y-3">
                    {packageInfo.features.map((feature, i) => (
                      <motion.li
                        key={feature}
                        className="flex items-start gap-3 text-[var(--text-primary)]"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.05 }}
                      >
                        <svg className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </motion.li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-[var(--color-accent)]/10 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Delivery: {packageInfo.delivery}
                  </div>
                </div>
              </motion.div>

              {/* What's Not Included */}
              {sections?.exclusions && (
                <motion.div variants={itemVariants}>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </div>
                    What&apos;s Not Included
                  </h2>
                  <div className="bg-red-50/50 rounded-xl p-5 border border-red-100">
                    <p className="text-xs text-[var(--text-muted)] mb-3">Scope boundaries so there are no surprises:</p>
                    <ul className="space-y-2">
                      {sections.exclusions.split('\n').filter(Boolean).map((line, i) => (
                        <li key={i} className="flex items-start gap-3 text-[var(--text-muted)] text-sm">
                          <svg className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>{line.replace(/^[-•]\s*/, '')}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-[var(--text-muted)] mt-3 pt-3 border-t border-red-100">
                      If you need any of the above down the line, we can scope that separately.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Timeline */}
              {sections?.timeline_notes && (
                <motion.div variants={itemVariants}>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-[var(--color-accent)]/10 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    Timeline
                  </h2>
                  <div className="bg-gradient-to-br from-[var(--background)] to-[var(--color-accent)]/5 rounded-xl p-6 border border-[var(--color-accent)]/10">
                    <div className="space-y-3">
                      {sections.timeline_notes.split('\n').filter(Boolean).map((line, i) => {
                        const parts = line.split(':');
                        const milestone = parts[0]?.trim();
                        const detail = parts.slice(1).join(':').trim();
                        return (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-[var(--color-accent)]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-medium text-[var(--color-accent)]">{i + 1}</span>
                            </div>
                            <div>
                              <span className="font-medium text-[var(--text-primary)] text-sm">{milestone}</span>
                              {detail && <span className="text-[var(--text-muted)] text-sm"> — {detail}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-[var(--color-accent)]/10">
                      <p className="text-xs text-[var(--text-muted)]">
                        Total: {packageInfo.delivery} from kickoff. Clock starts when we receive your assets and 50% deposit.
                        All communication async — email and portal chat. No calls.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Custom Notes */}
              {proposal.notes && (
                <motion.div variants={itemVariants}>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-[var(--color-accent)]/10 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    Additional Notes
                  </h2>
                  <div className="bg-[var(--background)] rounded-xl p-4 text-[var(--text-muted)] whitespace-pre-wrap">
                    {proposal.notes}
                  </div>
                </motion.div>
              )}

              {/* Pricing */}
              <motion.div variants={itemVariants}>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-[var(--color-accent)]/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Investment
                </h2>
                <div className="bg-gradient-to-br from-[var(--background)] to-[var(--color-accent)]/5 rounded-xl p-6 border border-[var(--color-accent)]/10">
                  <div className="flex justify-between items-center pb-4 border-b border-[var(--color-accent)]/10">
                    <span className="text-[var(--text-muted)]">Total Project Cost</span>
                    <span className="text-2xl font-bold text-[var(--color-accent)]">{formatPrice(price)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-[var(--text-muted)]">Deposit (50% to start)</span>
                    <span className="font-semibold text-[var(--text-primary)]">{formatPrice(deposit)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-[var(--color-accent)]/10">
                    <span className="text-[var(--text-muted)]">Final Payment (before launch)</span>
                    <span className="font-semibold text-[var(--text-primary)]">{formatPrice(deposit)}</span>
                  </div>
                </div>
              </motion.div>

              {/* Validity */}
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-between p-4 bg-[var(--background)] rounded-xl"
              >
                <span className="text-sm text-[var(--text-muted)]">
                  This proposal is valid until
                </span>
                <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>
                  {new Date(proposal.valid_until).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </motion.div>

              {/* How to Proceed */}
              {sections && !isExpired && !isAccepted && (
                <motion.div variants={itemVariants}>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-[var(--color-accent)]/10 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                    How to Proceed
                  </h2>
                  <div className="space-y-3">
                    {[
                      'Reply to our email confirming the scope looks right (or flag any adjustments)',
                      'Click "Accept & Pay Deposit" below to pay the 50% deposit via PayPal',
                      'Upload your brand assets and any access credentials via your portal',
                      'We start building — you\'ll hear from us at each checkpoint',
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-[var(--color-accent)] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-white">{i + 1}</span>
                        </div>
                        <p className="text-[var(--text-muted)] text-sm">{step}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* CTA Button */}
              {!isExpired && !isAccepted && (
                <motion.div variants={itemVariants} className="pt-4">
                  <motion.button
                    onClick={handleAcceptAndPay}
                    disabled={paymentLoading}
                    className="block w-full text-center bg-gradient-to-r from-[#E8F0F8] via-[#9ABCD8] to-[#3A6A8A] text-[#1A3A5A] py-4 rounded-xl font-semibold text-lg shadow-lg shadow-[#3A6A8A]/25 hover:shadow-xl hover:shadow-[#3A6A8A]/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    whileHover={paymentLoading ? {} : { scale: 1.02 }}
                    whileTap={paymentLoading ? {} : { scale: 0.98 }}
                  >
                    {paymentLoading ? 'Redirecting to PayPal...' : `Accept & Pay Deposit (${formatPrice(deposit)})`}
                  </motion.button>
                  {paymentError && (
                    <p className="text-center text-sm text-red-600 mt-3">
                      {paymentError}
                    </p>
                  )}
                  <p className="text-center text-sm text-[var(--text-muted)] mt-3">
                    You&apos;ll be redirected to PayPal to complete your secure payment
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Contact Section */}
          <motion.div
            variants={itemVariants}
            className="mt-8 text-center text-[var(--text-muted)]"
          >
            <p>
              Questions about this proposal?{' '}
              <a
                href="mailto:stratalanding@gmail.com"
                className="text-[var(--color-accent)] hover:underline font-medium"
              >
                Contact us
              </a>
            </p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
