'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { milestoneLabels, type MilestoneType } from '@/lib/types';
import type { ProjectWithMilestones } from './page';
import { StatusBadge } from '@/app/admin/_components/admin-ui';
import { SpotlightCard, RevealGroup, RevealItem, NumberTicker, MeterBar, SuccessCheck, Pressable } from '@/app/admin/_components/motion';
import { toast } from '@/app/admin/_components/Toaster';

const packageLabels: Record<string, string> = {
  starter: 'Presence Page',
  growth: 'Lead Page',
  scale: 'Purchase Page',
};

interface MilestonesListProps {
  initialProjects: ProjectWithMilestones[];
}

export default function MilestonesList({ initialProjects }: MilestonesListProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [initializingId, setInitializingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function initializeMilestones(projectId: string) {
    setInitializingId(projectId);
    try {
      const res = await fetch('/api/admin/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, action: 'initialize' }),
      });
      const data = await res.json();
      if (res.ok) {
        setProjects(prev => prev.map(p =>
          p.id === projectId ? { ...p, milestones: data.milestones } : p
        ));
        toast.success('Milestones initialized');
      } else {
        throw new Error(data?.error || 'Failed');
      }
    } catch (err) {
      console.error('Failed to initialize milestones:', err);
      toast.error('Could not initialize milestones', 'Please try again.');
    } finally {
      setInitializingId(null);
    }
  }

  async function updateMilestone(milestoneId: string, projectId: string, status: string, notes?: string) {
    setUpdatingId(milestoneId);
    try {
      const body: Record<string, unknown> = { milestoneId, status };
      if (notes !== undefined) body.notes = notes;

      const res = await fetch('/api/admin/milestones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setProjects(prev => prev.map(p =>
          p.id === projectId
            ? { ...p, milestones: p.milestones.map(m => m.id === milestoneId ? data.milestone : m) }
            : p
        ));
        toast.success(status === 'completed' ? 'Milestone completed' : 'Milestone updated');
      } else {
        throw new Error(data?.error || 'Failed');
      }
    } catch (err) {
      console.error('Failed to update milestone:', err);
      toast.error('Could not update milestone', 'Please try again.');
    } finally {
      setUpdatingId(null);
    }
  }

  const completedCount = (milestones: ProjectWithMilestones['milestones']) =>
    milestones.filter(m => m.status === 'completed').length;

  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-background rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <p className="text-text-muted">No projects yet. Milestones will appear here once you have active projects.</p>
      </div>
    );
  }

  return (
    <RevealGroup className="space-y-3">
      {projects.map((project) => {
        const isExpanded = expandedId === project.id;
        const hasMilestones = project.milestones.length > 0;
        const completed = completedCount(project.milestones);
        const total = project.milestones.length;
        const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <RevealItem key={project.id}>
          <SpotlightCard
            padded={false}
            className="rounded-xl border border-border overflow-hidden"
          >
            {/* Project Header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : project.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-background transition-colors text-left"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-text-primary truncate">
                      {project.company_name || project.client_email}
                    </span>
                    <StatusBadge status={project.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span>{packageLabels[project.package] || project.package}</span>
                    <span>{project.client_name || project.client_email}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                {hasMilestones && (
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-32">
                      <MeterBar percentage={progressPct} height={8} />
                    </div>
                    <span className="text-xs text-text-muted w-12 text-right tabular-nums">
                      <NumberTicker value={completed} />/{total}
                    </span>
                  </div>
                )}

                <svg
                  className={`w-5 h-5 text-text-muted transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Expanded Milestones */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-border">
                    {!hasMilestones ? (
                      <div className="py-6 text-center">
                        <p className="text-sm text-text-muted mb-3">No milestones initialized for this project.</p>
                        <Pressable
                          onClick={() => initializeMilestones(project.id)}
                          disabled={initializingId === project.id}
                          className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
                          {initializingId === project.id ? 'Initializing...' : 'Initialize Milestones'}
                        </Pressable>
                      </div>
                    ) : (
                      <div className="pt-4 space-y-1">
                        {project.milestones.map((milestone, mi) => {
                          const info = milestoneLabels[milestone.milestone_type as MilestoneType];
                          const isCompleted = milestone.status === 'completed';
                          const isApproval = milestone.requires_approval;
                          const isApproved = !!milestone.client_approved_at;
                          const isUpdating = updatingId === milestone.id;

                          return (
                            <div
                              key={milestone.id}
                              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                                isCompleted ? 'bg-green-50/50' : 'hover:bg-background'
                              }`}
                            >
                              {/* Step Number / Check */}
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isCompleted
                                  ? 'bg-green-500 text-white'
                                  : milestone.status === 'in_progress'
                                  ? 'bg-accent text-white'
                                  : 'bg-background text-text-muted'
                              }`}>
                                {isCompleted ? (
                                  <SuccessCheck show size={16} color="#ffffff" />
                                ) : (
                                  <span className="text-xs font-medium">{mi + 1}</span>
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${isCompleted ? 'text-green-700' : 'text-text-primary'}`}>
                                    {info?.label || milestone.milestone_type}
                                  </span>
                                  {isApproval && (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      isApproved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {isApproved ? 'Client Approved' : 'Needs Approval'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-text-muted mt-0.5">
                                  {info?.description}
                                </p>
                                {milestone.notes && (
                                  <p className="text-xs text-text-muted mt-1 italic">
                                    Note: {milestone.notes}
                                  </p>
                                )}
                                {milestone.completed_at && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Completed {new Date(milestone.completed_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex-shrink-0 flex items-center gap-1">
                                {!isCompleted && (
                                  <>
                                    {milestone.status === 'pending' && (
                                      <Pressable
                                        onClick={() => updateMilestone(milestone.id, project.id, 'in_progress')}
                                        disabled={isUpdating}
                                        className="px-2 py-1 text-xs bg-background text-text-muted rounded hover:bg-accent/10 hover:text-accent transition-colors disabled:opacity-50"
                                        title="Start"
                                      >
                                        Start
                                      </Pressable>
                                    )}
                                    {!isApproval && (
                                      <Pressable
                                        onClick={() => updateMilestone(milestone.id, project.id, 'completed')}
                                        disabled={isUpdating}
                                        className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors disabled:opacity-50"
                                        title="Mark Complete"
                                      >
                                        {isUpdating ? '...' : 'Complete'}
                                      </Pressable>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SpotlightCard>
          </RevealItem>
        );
      })}
    </RevealGroup>
  );
}
