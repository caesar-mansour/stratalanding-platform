'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RevealGroup, RevealItem, NumberTicker, AnimatedRing } from '@/app/admin/_components/motion';
import type { OnboardingSessionWithContext } from './page';

type FilterTab = 'all' | 'in_progress' | 'completed';

const statusLabels: Record<string, string> = {
  in_progress: 'In Progress',
  completed: 'Completed',
};

const statusColors: Record<string, string> = {
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
};

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function OnboardingList({ initialSessions }: { initialSessions: OnboardingSessionWithContext[] }) {
  const [sessions] = useState<OnboardingSessionWithContext[]>(initialSessions);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSummaryId, setShowSummaryId] = useState<string | null>(null);

  const filteredSessions = filter === 'all' ? sessions : sessions.filter(s => s.status === filter);

  const counts = {
    all: sessions.length,
    in_progress: sessions.filter(s => s.status === 'in_progress').length,
    completed: sessions.filter(s => s.status === 'completed').length,
  };

  const filters: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-white border border-border text-text-muted hover:bg-gray-50'
            }`}
          >
            {f.label}
            <span className={`ml-1.5 text-xs ${filter === f.key ? 'text-white/70' : 'text-text-muted'}`}>
              <NumberTicker value={counts[f.key]} className="inline" />
            </span>
            {filter === f.key && (
              <motion.span
                layoutId="onboardingTabUnderline"
                className="absolute left-2 right-2 -bottom-1 h-0.5 rounded-full bg-[var(--color-accent)]"
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="font-medium text-text-primary mb-1">
            {filter === 'all' ? 'No onboarding sessions yet' : `No ${statusLabels[filter].toLowerCase()} sessions`}
          </h3>
          <p className="text-sm text-text-muted">
            Onboarding interviews appear here when clients start them from their portal.
          </p>
        </div>
      ) : (
        <RevealGroup stagger={0.04} className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredSessions.map((session) => (
              <RevealItem
                key={session.id}
                y={16}
                className="bg-white rounded-xl border border-border overflow-hidden hover:shadow-sm transition-shadow"
              >
                {/* Header */}
                <div
                  className="px-5 py-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[session.status]}`}>
                          {statusLabels[session.status]}
                        </span>
                        {/* Progress */}
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          {session.answers_count}/10 answered
                        </span>
                      </div>
                      <h3 className="font-medium text-text-primary">
                        {session.client_name || session.client_email}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                        {session.company_name && (
                          <>
                            <span>{session.company_name}</span>
                            <span>·</span>
                          </>
                        )}
                        <span>{session.project_package} package</span>
                        <span>·</span>
                        <span>{timeAgo(session.started_at)}</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2 w-full max-w-xs">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${session.status === 'completed' ? 'bg-green-500' : 'bg-cyan-500'}`}
                            style={{ width: `${(session.answers_count / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Completion Ring */}
                    <AnimatedRing
                      value={session.answers_count}
                      max={10}
                      size={52}
                      stroke={5}
                      color={session.status === 'completed' ? '#22C55E' : '#0891B2'}
                      label={<span className="text-[11px] font-semibold tabular-nums">{session.answers_count}/10</span>}
                      className="flex-shrink-0"
                    />

                    {/* Expand Arrow */}
                    <svg
                      className={`w-5 h-5 text-text-muted transition-transform flex-shrink-0 mt-1 ${expandedId === session.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedId === session.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 border-t border-border pt-4">
                        {/* Summary Toggle (for completed sessions) */}
                        {session.status === 'completed' && session.summary && (
                          <div className="mb-4">
                            <button
                              onClick={() => setShowSummaryId(showSummaryId === session.id ? null : session.id)}
                              className="flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] hover:underline"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              {showSummaryId === session.id ? 'Hide Summary' : 'View AI Summary'}
                            </button>
                            <AnimatePresence>
                              {showSummaryId === session.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-3 p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <svg className="w-3.5 h-3.5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                      </svg>
                                      <span className="text-xs font-medium text-cyan-700">AI-Generated Summary</span>
                                    </div>
                                    <div className="text-sm text-text-primary whitespace-pre-wrap prose prose-sm max-w-none">
                                      {session.summary}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* Full Conversation */}
                        <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">
                          Full Conversation
                        </h4>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {session.messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex gap-2 ${msg.role === 'client' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
                                msg.role === 'client'
                                  ? 'bg-[var(--color-accent)] text-white rounded-br-sm'
                                  : 'bg-cyan-50 border border-cyan-200 text-text-primary rounded-bl-sm'
                              }`}>
                                {msg.role === 'ai' && msg.question_number && (
                                  <span className="text-[10px] font-semibold text-cyan-600 uppercase tracking-wide block mb-1">
                                    Q{msg.question_number} of 10
                                  </span>
                                )}
                                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                <p className={`text-[10px] mt-1 ${msg.role === 'client' ? 'text-white/60' : 'text-gray-400'}`}>
                                  {new Date(msg.created_at).toLocaleString('en-US', {
                                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </RevealItem>
            ))}
          </AnimatePresence>
        </RevealGroup>
      )}
    </div>
  );
}
