'use client';

import { motion } from 'framer-motion';
import {
  GradientText,
  NumberTicker,
  RevealGroup,
  RevealItem,
  MeterBar,
  Pulse,
  LiveDot,
} from '@/app/portal/components/portal-ui';

interface StatusInfo {
  label: string;
  description: string;
  nextAction?: string | null;
}

interface Milestone {
  status: string;
  label: string;
  description: string;
}

interface TimelineContentProps {
  status: StatusInfo;
  milestones: Milestone[];
  currentStatus: string;
  currentStatusIndex: number;
  statusOrder: string[];
}

const GLASS =
  'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]';

export default function TimelineContent({
  status,
  milestones,
  currentStatus,
  currentStatusIndex,
  statusOrder,
}: TimelineContentProps) {
  const totalSteps = milestones.length;
  const stepNumber = Math.min(currentStatusIndex + 1, totalSteps);
  const progressPct =
    totalSteps > 1 ? (currentStatusIndex / (totalSteps - 1)) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <RevealGroup>
        <RevealItem className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            <GradientText>Project Timeline</GradientText>
          </h1>
          <p className="text-text-muted">
            Track your project progress through each milestone.
          </p>
        </RevealItem>
      </RevealGroup>

      {/* Current Status Banner */}
      <RevealGroup>
        <RevealItem className="mb-8">
          <motion.div
            className={`${GLASS} p-6`}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start gap-4">
              <motion.div
                className="w-10 h-10 bg-[var(--color-accent)] rounded-full flex items-center justify-center flex-shrink-0"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.3 }}
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Pulse>
                    <LiveDot color="#0891B2" size={8} />
                  </Pulse>
                  <h2 className="font-semibold text-text-primary">
                    Current Status: {status.label}
                  </h2>
                </div>
                <p className="text-text-muted mb-2">{status.description}</p>
                {status.nextAction && (
                  <motion.p
                    className="text-sm font-medium text-[var(--color-accent)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Next: {status.nextAction}
                  </motion.p>
                )}

                {/* Overall progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5 text-xs text-text-muted">
                    <span>
                      Step <NumberTicker value={stepNumber} format="number" /> of{' '}
                      <NumberTicker value={totalSteps} format="number" />
                    </span>
                    <span className="font-medium text-[var(--color-accent)]">
                      <NumberTicker value={Math.round(progressPct)} format="number" />%
                    </span>
                  </div>
                  <MeterBar percentage={progressPct} shimmer />
                </div>
              </div>
            </div>
          </motion.div>
        </RevealItem>
      </RevealGroup>

      {/* Timeline */}
      <RevealGroup>
        <RevealItem className="mb-8">
          <motion.div
            className={`relative ${GLASS} p-6 overflow-hidden`}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            {/* Blue gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#22D3EE] via-[#0891B2] to-[#0B1B3A]" />

            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] grid place-items-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-text-primary">
                Project Milestones
              </h2>
            </div>

            <div className="relative">
              {/* Animated Vertical line */}
              <motion.div
                className="absolute left-5 top-5 bottom-5 w-0.5 bg-border"
                initial={{ scaleY: 0, originY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />

              {/* Progress line */}
              <motion.div
                className="absolute left-5 top-5 w-0.5 bg-gradient-to-b from-[#22D3EE] to-[#0891B2]"
                style={{
                  height: `${(currentStatusIndex / (milestones.length - 1)) * 100}%`,
                }}
                initial={{ scaleY: 0, originY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
              />

              <RevealGroup className="space-y-6">
                {milestones.map((milestone, index) => {
                  const milestoneIndex = statusOrder.indexOf(milestone.status);
                  const isCompleted = milestoneIndex < currentStatusIndex;
                  const isCurrent = milestone.status === currentStatus;
                  const isPending = milestoneIndex > currentStatusIndex;

                  return (
                    <RevealItem key={milestone.status} className="relative flex gap-4">
                      {/* Circle indicator */}
                      <div className="relative flex-shrink-0 z-10 w-10 h-10">
                        {/* Pulsing halo for the active node */}
                        {isCurrent && (
                          <motion.span
                            aria-hidden
                            className="absolute inset-0 rounded-full bg-[#0891B2]/30"
                            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                            style={{ willChange: 'transform, opacity' }}
                          />
                        )}
                        <motion.div
                          className={`relative w-10 h-10 rounded-full flex items-center justify-center ${
                            isCompleted
                              ? 'bg-gradient-to-br from-[#22D3EE] to-[#0891B2] shadow-md shadow-[#0891B2]/25'
                              : isCurrent
                              ? 'bg-[#0891B2] shadow-lg shadow-[#0891B2]/30'
                              : 'bg-background border-2 border-[#22D3EE]/40'
                          }`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 25,
                            delay: 0.5 + index * 0.1,
                          }}
                          whileHover={{ scale: 1.1 }}
                        >
                          {isCompleted ? (
                          <motion.svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </motion.svg>
                        ) : isCurrent ? (
                          <Pulse>
                            <div className="w-3 h-3 bg-white rounded-full" />
                          </Pulse>
                          ) : (
                            <span className="text-sm text-text-muted">{index + 1}</span>
                          )}
                        </motion.div>
                      </div>

                      {/* Content */}
                      <div className={`pb-6 ${isPending ? 'opacity-50' : ''}`}>
                        <h3
                          className={`font-medium ${
                            isCurrent ? 'text-[var(--color-accent)]' : 'text-text-primary'
                          }`}
                        >
                          {milestone.label}
                          {isCurrent && (
                            <motion.span
                              className="ml-2 text-xs bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-2 py-0.5 rounded-full"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.7 }}
                            >
                              Current
                            </motion.span>
                          )}
                        </h3>
                        <p className="text-sm text-text-muted mt-1">
                          {milestone.description}
                        </p>
                      </div>
                    </RevealItem>
                  );
                })}
              </RevealGroup>
            </div>
          </motion.div>
        </RevealItem>
      </RevealGroup>

      {/* Checkpoint Explanation */}
      <RevealGroup>
        <RevealItem className="mt-8">
          <motion.div
            className={`${GLASS} p-6`}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] grid place-items-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-text-primary">
                What to Expect
              </h2>
            </div>
            <motion.div
              className="space-y-4 text-sm text-text-muted"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.1 } },
              }}
            >
              {[
                { title: 'Checkpoints:', text: "During production, we'll share progress at key milestones for your feedback. You'll receive email notifications when checkpoints are ready for review." },
                { title: 'Revisions:', text: "Your package includes revision rounds. We'll incorporate your feedback at each checkpoint." },
                { title: 'Launch:', text: "Once final payment is received, we'll prepare your landing page for launch and coordinate the handoff with you." },
              ].map((item) => (
                <motion.p
                  key={item.title}
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    visible: { opacity: 1, x: 0 },
                  }}
                >
                  <strong className="text-text-primary">{item.title}</strong>{' '}
                  {item.text}
                </motion.p>
              ))}
            </motion.div>
          </motion.div>
        </RevealItem>
      </RevealGroup>

      {/* Contact */}
      <RevealGroup>
        <RevealItem className="mt-6">
          <motion.div
            className="p-4 bg-gradient-to-r from-[var(--color-accent)]/5 to-transparent rounded-[var(--radius-md)] border border-[var(--color-accent)]/20"
            whileHover={{ scale: 1.01 }}
          >
            <p className="text-sm text-text-muted">
              Questions about your project status?{' '}
              <motion.a
                href="mailto:stratalanding@gmail.com"
                className="rounded-sm text-[var(--color-accent)] font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50"
                whileHover={{ scale: 1.02 }}
              >
                Contact us
              </motion.a>
            </p>
          </motion.div>
        </RevealItem>
      </RevealGroup>
    </div>
  );
}
