'use client';

import { motion } from 'framer-motion';

interface GuaranteeBadgeProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export default function GuaranteeBadge({ variant = 'default', className = '' }: GuaranteeBadgeProps) {
  if (variant === 'compact') {
    return (
      <motion.div
        className={`inline-flex items-center gap-2 px-3 py-1.5 bg-[#ECFEFF] border border-[#0891B2]/20 rounded-full ${className}`}
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        whileHover={{ scale: 1.05 }}
      >
        <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium text-accent">Satisfaction Guaranteed</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`bg-gradient-to-r from-[#ECFEFF] to-[#F0FBFF] border border-[#0891B2]/20 rounded-xl p-5 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-[#22D3EE] to-[#0891B2] rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h4 className="font-semibold text-[#0B1B3A] mb-1">Satisfaction Guarantee</h4>
          <p className="text-sm text-[#334155] leading-relaxed">
            Not happy with your landing page? We&apos;ll work with you through all included revision rounds.
            If we can&apos;t get it right, you can request a 50% refund before final delivery.
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[#0891B2]/20 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-accent">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Revisions included</span>
        </div>
        <div className="flex items-center gap-1.5 text-accent">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Refund option</span>
        </div>
        <div className="flex items-center gap-1.5 text-accent">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>No risk</span>
        </div>
      </div>
    </motion.div>
  );
}
