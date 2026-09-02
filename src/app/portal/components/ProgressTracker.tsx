'use client';

import { motion } from 'framer-motion';
import { ProjectStatus } from '@/lib/types';
import {
  GradientText,
  NumberTicker,
  MeterBar,
  Pulse,
  SuccessCheck,
} from '@/app/portal/components/portal-ui';

interface ProgressTrackerProps {
  currentStatus: ProjectStatus;
  isPhoneLead?: boolean;
}

const steps = [
  { status: 'new', label: 'Brief', icon: '📝' },
  { status: 'proposal_sent', label: 'Proposal', icon: '📄' },
  { status: 'deposit_paid', label: 'Deposit', icon: '💳' },
  { status: 'in_production', label: 'Building', icon: '🔨' },
  { status: 'ready_for_final_payment', label: 'Review', icon: '👀' },
  { status: 'paid_in_full', label: 'Final Pay', icon: '✅' },
  { status: 'launched', label: 'Launched', icon: '🚀' },
];

const statusOrder: Record<string, number> = {
  new: 0,
  proposal_sent: 1,
  deposit_paid: 2,
  in_production: 3,
  ready_for_final_payment: 4,
  paid_in_full: 5,
  launched: 6,
  not_interested: -1,
};

export default function ProgressTracker({ currentStatus, isPhoneLead = false }: ProgressTrackerProps) {
  const currentIndex = statusOrder[currentStatus] ?? 0;

  if (currentStatus === 'not_interested') {
    return null;
  }

  const pctComplete = Math.round((currentIndex / (steps.length - 1)) * 100);

  return (
    <motion.div
      className="rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)] p-4 sm:p-6 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[var(--color-accent)]/10 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            <GradientText>Project Progress</GradientText>
          </h2>
          <p className="text-sm text-text-muted">Track your project journey</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative overflow-x-auto pb-2 -mx-1 px-1">
        <div className="min-w-[500px] sm:min-w-0 relative">
          {/* Background line */}
          <div className="absolute top-5 sm:top-6 left-0 right-0 h-1 bg-gray-200 rounded-full" />

          {/* Active progress line */}
          <motion.div
            className="absolute top-5 sm:top-6 left-0 h-1 bg-gradient-to-r from-[#0891B2] to-[#0B1B3A] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />

          {/* Steps */}
          <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;
            // Phone leads approved a preview, not a brief — relabel the first step.
            const stepLabel = isPhoneLead && step.status === 'new' ? 'Preview' : step.label;
            const stepIcon = isPhoneLead && step.status === 'new' ? '✨' : step.icon;

            const circle = (
              <motion.div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl relative z-10 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gradient-to-br from-[#0891B2] to-[#0B1B3A] text-white shadow-lg shadow-[#0891B2]/30'
                    : isCurrent
                    ? 'bg-white border-[3px] border-[#0891B2] shadow-lg shadow-[#0891B2]/25'
                    : 'bg-gray-100/80 border-2 border-gray-200'
                }`}
                whileHover={{ scale: 1.1 }}
              >
                {isCompleted ? (
                  <SuccessCheck show size={26} color="#ffffff" />
                ) : (
                  <span className={isPending ? 'opacity-40' : ''}>{stepIcon}</span>
                )}
              </motion.div>
            );

            return (
              <motion.div
                key={step.status}
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Step circle — current step gets a calm cyan pulse glow */}
                {isCurrent ? (
                  <Pulse color="#0891B2">{circle}</Pulse>
                ) : (
                  circle
                )}

                {/* Label */}
                <motion.span
                  className={`mt-2 text-xs font-medium text-center transition-colors ${
                    isCompleted || isCurrent
                      ? 'text-text-primary'
                      : 'text-text-muted'
                  }`}
                >
                  {stepLabel}
                </motion.span>

                {/* Current indicator */}
                {isCurrent && (
                  <motion.span
                    className="mt-1 text-xs px-2 py-0.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-full font-medium"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    Current
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </div>
        </div>
      </div>

      {/* Completion meter */}
      <div className="mt-6">
        <MeterBar percentage={pctComplete} color="#0891B2" height={6} delay={0.3} shimmer />
      </div>

      {/* Completion percentage */}
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-text-muted">
          Step <NumberTicker value={currentIndex + 1} /> of <NumberTicker value={steps.length} />
        </span>
        <span className="font-semibold text-[var(--color-accent)]">
          <NumberTicker value={pctComplete} format="percent" /> Complete
        </span>
      </div>
    </motion.div>
  );
}
