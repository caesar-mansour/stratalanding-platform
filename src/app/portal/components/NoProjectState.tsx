'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { GradientText } from '@/app/portal/components/portal-ui';

export function NoProjectState({ clientName }: { clientName: string }) {
  return (
    <motion.div
      className="max-w-2xl mx-auto text-center py-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)] px-8 py-12 sm:px-12"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <motion.div
          className="w-20 h-20 bg-[var(--color-accent)]/10 rounded-full flex items-center justify-center mx-auto mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
        >
          <svg className="w-10 h-10 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </motion.div>

        <motion.h1
          className="text-2xl font-bold mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <GradientText>Welcome, {clientName}!</GradientText>
        </motion.h1>

        <motion.p
          className="text-text-muted mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          You don&apos;t have any active projects right now. Submit a new brief to get started — we&apos;ll have a proposal ready within 24 hours.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link
            href="/brief"
            className="group inline-block rounded-xl bg-[#0F172A] px-6 py-3 font-medium shadow-[0_10px_30px_-12px_rgba(11,27,58,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-[0_16px_40px_-12px_rgba(8,145,178,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 focus-visible:ring-offset-2 active:translate-y-0"
          >
            <span className="flex items-center gap-2 text-white">
              Start a Project Brief
              <svg className="w-4 h-4 text-white transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </Link>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
