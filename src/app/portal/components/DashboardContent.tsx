'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ReactNode } from 'react';
import ProgressTracker from './ProgressTracker';
import FileLibraryWidget from './FileLibraryWidget';
import PaymentButton from './PaymentButton';
import { ProjectStatus } from '@/lib/types';
import { PortalPageHeader } from './portal-ui';

const GLASS = 'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]';

interface StatusInfo {
  label: string;
  description: string;
  nextAction?: string | null;
  showDepositLink?: boolean;
  showFinalLink?: boolean;
}

interface PaymentAmounts {
  totalFormatted: string;
  depositFormatted: string;
  finalFormatted: string;
}

interface DashboardContentProps {
  clientName: string;
  packageLabel: string;
  status: StatusInfo;
  projectStatus: ProjectStatus;
  projectId: string;
  paymentAmounts: PaymentAmounts;
  previewUrl: string | null;
  isPhoneLead?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15 } },
};

const cardHover = {
  y: -3,
  boxShadow: '0 16px 44px -12px rgba(8,145,178,0.28)',
  transition: { duration: 0.2 },
};

export default function DashboardContent({
  clientName,
  packageLabel,
  status,
  projectStatus,
  projectId,
  paymentAmounts,
  previewUrl,
  isPhoneLead = false,
}: DashboardContentProps) {
  return (
    <motion.div
      className="max-w-3xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Header */}
      <PortalPageHeader
        eyebrow={packageLabel}
        title={<>Welcome back, {clientName}</>}
        subtitle="Here's an overview of your project."
      />

      {/* Progress Tracker */}
      <ProgressTracker currentStatus={projectStatus} isPhoneLead={isPhoneLead} />

      {/* Preview Link Card */}
      {previewUrl && (
        <motion.div
          className={`relative ${GLASS} p-6 mb-6 overflow-hidden hover:border-[#22D3EE]/40 transition-colors`}
          variants={itemVariants}
          whileHover={cardHover}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#22D3EE] via-[#0891B2] to-[#0B1B3A]" />

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-accent)]/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Preview Your Page</h2>
                <p className="text-sm text-text-muted">View the work in progress</p>
              </div>
            </div>
          </div>

          <motion.a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-between p-4 bg-white rounded-[var(--radius-md)] border border-cyan-200 hover:border-cyan-400 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <span className="text-sm text-cyan-700 truncate font-medium">
                {previewUrl.replace(/^https?:\/\//, '')}
              </span>
            </div>
            <span className="text-cyan-600 font-medium text-sm flex items-center gap-1 flex-shrink-0 group-hover:translate-x-1 transition-transform">
              Open Preview
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </motion.a>

          <p className="mt-3 text-xs text-cyan-600/70">
            This is a staging preview. The final version will be deployed after payment.
          </p>
        </motion.div>
      )}

      {/* Project Status Card */}
      <motion.div
        className={`relative ${GLASS} p-6 mb-6 overflow-hidden hover:border-[#22D3EE]/40 transition-colors`}
        variants={itemVariants}
        whileHover={cardHover}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#22D3EE] via-[#0891B2] to-[#0B1B3A]" />

        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--color-accent)]/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Project Status</h2>
              <p className="text-sm text-text-muted">{packageLabel}</p>
            </div>
          </div>
          <motion.span
            className="px-3 py-1.5 bg-gradient-to-r from-[var(--color-accent)]/10 to-[var(--color-accent)]/5 text-[var(--color-accent)] text-sm font-medium rounded-full border border-[var(--color-accent)]/20"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.4 }}
          >
            {status.label}
          </motion.span>
        </div>

        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="p-4 bg-gradient-to-br from-background to-[var(--color-accent)]/5 rounded-[var(--radius-md)] border border-[var(--color-accent)]/10">
            <p className="text-text-primary">{status.description}</p>
          </div>

          {status.nextAction && (
            <motion.div
              className="p-4 border border-[var(--color-accent)]/30 bg-gradient-to-r from-[var(--color-accent)]/10 to-[var(--color-accent)]/5 rounded-[var(--radius-md)]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <p className="text-sm font-medium text-[var(--color-accent)]">Next Step</p>
              </div>
              <p className="text-text-primary">{status.nextAction}</p>
            </motion.div>
          )}
        </motion.div>

        {status.showDepositLink && (
          <motion.div
            className="mt-6 pt-6 border-t border-border"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <PaymentButton
              projectId={projectId}
              paymentType="deposit"
              amount={paymentAmounts.depositFormatted}
            />
          </motion.div>
        )}

        {status.showFinalLink && (
          <motion.div
            className="mt-6 pt-6 border-t border-border"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <PaymentButton
              projectId={projectId}
              paymentType="final"
              amount={paymentAmounts.finalFormatted}
            />
          </motion.div>
        )}
      </motion.div>

      {/* Payment Receipt */}
      {(projectStatus === 'deposit_paid' || projectStatus === 'in_production' || projectStatus === 'ready_for_final_payment' || projectStatus === 'paid_in_full' || projectStatus === 'launched') && (
        <motion.div
          className={`relative ${GLASS} p-6 mb-6 overflow-hidden`}
          variants={itemVariants}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#34D399] via-[#10B981] to-[#34D399]" />

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-emerald-900">Payment Received</h2>
          </div>

          <div className="space-y-3 bg-white/60 rounded-[var(--radius-md)] p-4 border border-emerald-100">
            <div className="flex justify-between items-center">
              <span className="text-emerald-700 font-medium">Deposit (50%)</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-emerald-800">{paymentAmounts.depositFormatted}</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Paid</span>
              </div>
            </div>

            {(projectStatus === 'paid_in_full' || projectStatus === 'launched') && (
              <div className="flex justify-between items-center pt-3 border-t border-emerald-100">
                <span className="text-emerald-700 font-medium">Final Payment (50%)</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-800">{paymentAmounts.finalFormatted}</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Paid</span>
                </div>
              </div>
            )}

            {projectStatus !== 'paid_in_full' && projectStatus !== 'launched' && (
              <div className="flex justify-between items-center pt-3 border-t border-emerald-100">
                <span className="text-gray-500">Final Payment (50%)</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-400">{paymentAmounts.finalFormatted}</span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">Due later</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-emerald-200">
              <span className="text-emerald-800 font-semibold">Total</span>
              <span className="font-bold text-emerald-900 text-lg">{paymentAmounts.totalFormatted}</span>
            </div>
          </div>

          <p className="text-xs text-emerald-600/70 mt-3 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Payments processed securely via PayPal
          </p>
        </motion.div>
      )}

      {/* Quick Links + files — premature for a fresh phone lead, so only for onboarded clients.
          (Timeline removed — the Dashboard's progress tracker already covers it.) */}
      {!isPhoneLead && (
        <>
          <motion.div className="grid md:grid-cols-2 gap-4" variants={containerVariants}>
            <QuickLink
              href="/portal/brief"
              title="View Brief"
              description="Review your submitted project brief"
              icon={
                <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <QuickLink
              href="/portal/uploads"
              title="Uploads"
              description="Share files and assets"
              icon={
                <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          </motion.div>

          {/* File Library Widget */}
          <div className="mt-6">
            <FileLibraryWidget />
          </div>
        </>
      )}
    </motion.div>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3, boxShadow: '0 16px 44px -12px rgba(8,145,178,0.28)' }}
      transition={{ duration: 0.2 }}
    >
      <Link
        href={href}
        className={`block ${GLASS} p-5 h-full transition-all hover:border-[#22D3EE]/40 hover:shadow-[0_16px_44px_-12px_rgba(8,145,178,0.28)] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50`}
      >
        <motion.div
          className="w-11 h-11 bg-gradient-to-br from-[var(--color-accent)]/10 to-[var(--color-accent)]/5 rounded-xl flex items-center justify-center mb-3 group-hover:from-[var(--color-accent)]/20 group-hover:to-[var(--color-accent)]/10 transition-all"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          {icon}
        </motion.div>
        <h3 className="font-medium text-text-primary mb-1 group-hover:text-[var(--color-accent)] transition-colors">{title}</h3>
        <p className="text-sm text-text-muted">{description}</p>
      </Link>
    </motion.div>
  );
}
