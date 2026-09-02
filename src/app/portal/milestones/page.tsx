'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePortalData } from '../PortalDataContext';
import { milestoneLabels, approvalMilestones, type MilestoneType } from '@/lib/types';
import Link from 'next/link';
import {
  GradientText,
  NumberTicker,
  MeterBar,
  SuccessCheck,
  RevealGroup,
  RevealItem,
  PortalButton,
} from '../components/portal-ui';

const GLASS =
  'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]';

interface Milestone {
  id: string;
  milestone_type: MilestoneType;
  status: 'pending' | 'in_progress' | 'completed';
  notes: string | null;
  requires_approval: boolean;
  client_approved_at: string | null;
  completed_at: string | null;
}

export default function PortalMilestonesPage() {
  const { client, projects } = usePortalData();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveSuccess, setApproveSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMilestones() {
      try {
        const res = await fetch('/api/portal/milestones');
        const data = await res.json();
        if (res.ok) {
          setMilestones(data.milestones || []);
        }
      } catch (err) {
        console.error('Failed to fetch milestones:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMilestones();
  }, []);

  async function handleApprove(milestoneId: string) {
    setApprovingId(milestoneId);
    setApproveSuccess(null);
    try {
      const res = await fetch('/api/portal/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMilestones(prev =>
          prev.map(m => m.id === milestoneId ? data.milestone : m)
        );
        setApproveSuccess(milestoneId);
      }
    } catch (err) {
      console.error('Failed to approve milestone:', err);
    } finally {
      setApprovingId(null);
    }
  }

  if (!client || projects.length === 0) {
    return (
      <div className={`max-w-xl mx-auto text-center py-12 px-6 ${GLASS}`}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--color-accent)]/10 grid place-items-center">
          <svg className="w-8 h-8 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          <GradientText>No Project Found</GradientText>
        </h2>
        <p className="text-text-muted mb-4">
          We couldn&apos;t find an active project on your account yet. Head back to your dashboard to get started.
        </p>
        <Link
          href="/portal"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--color-accent)] to-[#0891B2] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`max-w-xl mx-auto text-center py-12 px-6 ${GLASS}`}>
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-[var(--color-accent)]/10 grid place-items-center">
          <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-lg font-semibold mb-1">
          <GradientText>Loading milestones</GradientText>
        </h2>
        <p className="text-text-muted">Pulling your latest project progress…</p>
      </div>
    );
  }

  if (milestones.length === 0) {
    return (
      <div className={`max-w-xl mx-auto text-center py-12 px-6 ${GLASS}`}>
        <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-accent)]/10 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          <GradientText>Milestones Coming Soon</GradientText>
        </h2>
        <p className="text-text-muted">
          Your project milestones will appear here once your project moves into production. You&apos;ll be able to track every step and approve key checkpoints.
        </p>
      </div>
    );
  }

  const completed = milestones.filter(m => m.status === 'completed').length;
  const total = milestones.length;
  const progressPct = Math.round((completed / total) * 100);

  // Find current (first non-completed) milestone
  const currentMilestone = milestones.find(m => m.status !== 'completed');

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mb-8 p-6 ${GLASS}`}
      >
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          <GradientText>Project Milestones</GradientText>
        </h1>
        <p className="text-text-muted">Track your project&apos;s progress through each delivery phase.</p>

        <div className="mt-3 flex items-center gap-2 text-sm text-text-muted">
          <span className="font-semibold text-text-primary">
            <NumberTicker value={completed} format="number" />
          </span>
          <span>of</span>
          <span className="font-semibold text-text-primary">
            <NumberTicker value={total} format="number" />
          </span>
          <span>milestones complete</span>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1">
            <MeterBar percentage={progressPct} height={12} shimmer />
          </div>
          <span className="text-sm font-medium text-text-primary">
            <NumberTicker value={progressPct} format="percent" />
          </span>
        </div>
      </motion.div>

      {/* Milestone List */}
      <RevealGroup className="space-y-2">
        {milestones.map((milestone, i) => {
          const info = milestoneLabels[milestone.milestone_type];
          const isCompleted = milestone.status === 'completed';
          const isCurrent = milestone.id === currentMilestone?.id;
          const isApprovalNeeded = milestone.requires_approval && !milestone.client_approved_at && milestone.status !== 'pending';
          const isApproved = !!milestone.client_approved_at;
          const justApproved = approveSuccess === milestone.id;

          return (
            <RevealItem
              key={milestone.id}
              className={`group flex items-start gap-4 p-4 backdrop-blur-md transition-[border-color,box-shadow,background-color] duration-200 hover:border-[#22D3EE]/40 ${
                isCurrent
                  ? 'rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/[0.06] shadow-[0_10px_40px_-14px_rgba(8,145,178,0.25)] hover:shadow-[0_18px_50px_-14px_rgba(8,145,178,0.35)]'
                  : isCompleted
                  ? 'rounded-2xl border border-emerald-200/70 bg-emerald-50/50 shadow-[0_10px_40px_-16px_rgba(16,185,129,0.18)] hover:shadow-[0_18px_50px_-16px_rgba(16,185,129,0.28)]'
                  : `${GLASS} hover:shadow-[0_1px_2px_-1px_rgba(11,27,58,0.10),0_20px_50px_-12px_rgba(11,27,58,0.26),inset_0_1px_0_0_rgba(255,255,255,0.7)]`
              }`}
            >
              {/* Step Indicator */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="relative w-8 h-8">
                  {/* Pulsing halo for the active node */}
                  {isCurrent && !isCompleted && (
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-[var(--color-accent)]/30"
                      animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                      style={{ willChange: 'transform, opacity' }}
                    />
                  )}
                  <div className={`relative w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-border text-text-muted'
                  }`}>
                    {isCompleted ? (
                      <SuccessCheck show size={18} color="#ffffff" />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                </div>
                {i < milestones.length - 1 && (
                  <div className={`w-0.5 h-6 mt-1 ${isCompleted ? 'bg-emerald-300' : 'bg-border'}`} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-medium text-sm ${
                    isCompleted ? 'text-emerald-700' : isCurrent ? 'text-[var(--color-accent)]' : 'text-text-primary'
                  }`}>
                    {info?.label}
                  </span>
                  {isCurrent && (
                    <span className="px-2 py-0.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[10px] font-medium rounded-full">
                      Current
                    </span>
                  )}
                  {isApproved && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-medium rounded-full">
                      Approved
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">{info?.description}</p>

                {milestone.notes && (
                  <p className="text-xs text-text-muted mt-2 italic border-l-2 border-[var(--color-accent)]/20 pl-2">
                    {milestone.notes}
                  </p>
                )}

                {milestone.completed_at && (
                  <p className="text-xs text-emerald-600 mt-1">
                    {new Date(milestone.completed_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                )}

                {/* Approval Button */}
                {isApprovalNeeded && !isCompleted && (
                  <PortalButton
                    onClick={() => handleApprove(milestone.id)}
                    disabled={approvingId === milestone.id}
                    className="mt-3 px-4 py-2 bg-gradient-to-r from-[var(--color-accent)] to-[#0891B2] text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    {approvingId === milestone.id ? 'Approving...' : 'Approve & Continue'}
                  </PortalButton>
                )}

                {justApproved && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-emerald-600 mt-2 font-medium"
                  >
                    Approved! The team has been notified.
                  </motion.p>
                )}
              </div>
            </RevealItem>
          );
        })}
      </RevealGroup>
    </div>
  );
}
