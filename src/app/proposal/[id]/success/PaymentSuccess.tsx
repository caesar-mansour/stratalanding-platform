'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { Proposal } from '@/lib/types';
import { formatPrice, getProposalPrice } from '@/lib/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function PaymentSuccess({ proposal }: { proposal: Proposal }) {
  const deposit = getProposalPrice(proposal) / 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--accent)]/5">
      {/* Header */}
      <header className="bg-gradient-to-r from-[var(--primary)] to-[#0B2545] text-white">
        <div className="container py-6">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <motion.div
              className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </motion.div>
            <span className="font-semibold">StrataLanding</span>
          </Link>
        </div>
      </header>

      <main className="container py-12">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Success Icon */}
          <motion.div
            className="mb-8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          >
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
              <motion.svg
                className="w-12 h-12 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </motion.svg>
            </div>
          </motion.div>

          {/* Success Message */}
          <motion.h1
            className="text-3xl font-bold text-[var(--text-primary)] mb-4"
            variants={itemVariants}
          >
            Payment Successful!
          </motion.h1>

          <motion.p
            className="text-lg text-[var(--text-muted)] mb-8"
            variants={itemVariants}
          >
            Thank you for your payment, {proposal.client_name}!
          </motion.p>

          {/* Payment Details Card */}
          <motion.div
            className="bg-white rounded-2xl shadow-xl border border-[var(--accent)]/20 p-8 mb-8 text-left"
            variants={itemVariants}
          >
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[var(--accent)]/10">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Deposit Received</p>
                <p className="text-sm text-[var(--text-muted)]">{proposal.company_name}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-2xl font-bold text-[var(--accent)]">{formatPrice(deposit)}</p>
                <p className="text-xs text-[var(--text-muted)]">50% deposit</p>
              </div>
            </div>

            {/* What's Next */}
            <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              What Happens Next
            </h2>

            <div className="space-y-4">
              {[
                {
                  step: '1',
                  title: 'Check your email',
                  description: 'We\'ll send you a magic link to access your client portal within the next few minutes.',
                },
                {
                  step: '2',
                  title: 'Complete your project brief',
                  description: 'Tell us more about your business, goals, and vision so we can create the perfect landing page.',
                },
                {
                  step: '3',
                  title: 'We start building',
                  description: 'Our team will begin designing and developing your landing page. You\'ll see progress updates in your portal.',
                },
                {
                  step: '4',
                  title: 'Review & Launch',
                  description: 'Review checkpoints, provide feedback, and once you\'re happy, we\'ll launch your new landing page!',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  className="flex gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                >
                  <div className="w-8 h-8 bg-[var(--accent)]/10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold text-[var(--accent)]">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{item.title}</p>
                    <p className="text-sm text-[var(--text-muted)]">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            variants={itemVariants}
          >
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[var(--accent)] to-[var(--primary)] text-white rounded-xl font-semibold shadow-lg shadow-[var(--accent)]/25 hover:shadow-xl hover:shadow-[var(--accent)]/30 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Go to Client Portal
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[var(--text-primary)] rounded-xl font-semibold border border-[var(--accent)]/20 hover:border-[var(--accent)]/40 transition-all"
            >
              Back to Homepage
            </Link>
          </motion.div>

          {/* Contact Info */}
          <motion.p
            className="mt-8 text-sm text-[var(--text-muted)]"
            variants={itemVariants}
          >
            Questions? Email us at{' '}
            <a href="mailto:stratalanding@gmail.com" className="text-[var(--accent)] hover:underline">
              stratalanding@gmail.com
            </a>
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
