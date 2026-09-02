'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RevealGroup, RevealItem, NumberTicker, Pressable } from '@/app/admin/_components/motion';
import { toast } from '@/app/admin/_components/Toaster';
import { confirmDialog } from '@/app/admin/_components/ConfirmDialog';
import type { MistakeWithContext, ProjectOption } from './page';

type MistakeStatus = 'open' | 'investigating' | 'fixed' | 'dismissed';
type FilterTab = 'all' | MistakeStatus;

const statusLabels: Record<MistakeStatus, string> = {
  open: 'Open',
  investigating: 'Investigating',
  fixed: 'Fixed',
  dismissed: 'Dismissed',
};

const statusColors: Record<MistakeStatus, string> = {
  open: 'bg-red-100 text-red-800',
  investigating: 'bg-yellow-100 text-yellow-800',
  fixed: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-600',
};

const sourceColors: Record<string, string> = {
  ai: 'bg-cyan-50 text-cyan-700',
  client: 'bg-purple-50 text-purple-700',
  admin: 'bg-blue-50 text-blue-700',
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

interface MistakesListProps {
  initialMistakes: MistakeWithContext[];
  projects: ProjectOption[];
}

export default function MistakesList({ initialMistakes, projects }: MistakesListProps) {
  const [mistakes, setMistakes] = useState<MistakeWithContext[]>(initialMistakes);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newMistake, setNewMistake] = useState({
    projectId: '',
    description: '',
  });

  const filteredMistakes = filter === 'all' ? mistakes : mistakes.filter(m => m.status === filter);

  const counts = {
    all: mistakes.length,
    open: mistakes.filter(m => m.status === 'open').length,
    investigating: mistakes.filter(m => m.status === 'investigating').length,
    fixed: mistakes.filter(m => m.status === 'fixed').length,
    dismissed: mistakes.filter(m => m.status === 'dismissed').length,
  };

  const updateMistake = async (mistakeId: string, status: MistakeStatus) => {
    setUpdating(mistakeId);
    try {
      const res = await fetch('/api/admin/mistakes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mistakeId, status }),
      });
      if (res.ok) {
        setMistakes(prev => prev.map(m =>
          m.id === mistakeId ? { ...m, status } : m
        ));
        toast.success('Status updated', statusLabels[status]);
      } else {
        throw new Error();
      }
    } catch (error) {
      console.error('Failed to update mistake:', error);
      toast.error('Could not update status', 'Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const deleteMistake = async (mistakeId: string) => {
    if (!(await confirmDialog({ title: 'Delete this mistake report?', message: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' })).confirmed) return;
    try {
      const res = await fetch(`/api/admin/mistakes?mistakeId=${mistakeId}`, { method: 'DELETE' });
      if (res.ok) {
        setMistakes(prev => prev.filter(m => m.id !== mistakeId));
        toast.success('Mistake report deleted');
      } else {
        throw new Error();
      }
    } catch (error) {
      console.error('Failed to delete mistake:', error);
      toast.error('Could not delete', 'Please try again.');
    }
  };

  const createMistakeHandler = async () => {
    if (!newMistake.projectId || !newMistake.description.trim()) {
      setCreateError('Project and description are required.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/admin/mistakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: newMistake.projectId,
          description: newMistake.description.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error || 'Failed to report mistake');
        return;
      }
      const data = await res.json();
      // Build a MistakeWithContext from the returned mistake + project info
      const project = projects.find(p => p.id === newMistake.projectId);
      const newMistakeWithContext: MistakeWithContext = {
        ...data.mistake,
        project_package: project?.package || '',
        project_status: project?.status || '',
        client_name: project?.client_name || null,
        client_email: project?.client_email || '',
        company_name: project?.company_name || null,
      };
      setMistakes(prev => [newMistakeWithContext, ...prev]);
      setNewMistake({ projectId: '', description: '' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create mistake:', error);
      setCreateError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const filters: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'investigating', label: 'Investigating' },
    { key: 'fixed', label: 'Fixed' },
    { key: 'dismissed', label: 'Dismissed' },
  ];

  return (
    <div>
      {/* Filter Tabs + Report Button */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
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
                layoutId="mistakesTabUnderline"
                className="absolute left-2 right-2 -bottom-1 h-0.5 rounded-full bg-[var(--color-accent)]"
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              />
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => { setShowCreateForm(!showCreateForm); setCreateError(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            showCreateForm
              ? 'bg-gray-200 text-gray-700'
              : 'bg-[var(--color-accent)] text-white hover:opacity-90'
          }`}
        >
          {showCreateForm ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Report Mistake
            </>
          )}
        </button>
      </div>

      {/* Report Mistake Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-white rounded-xl border border-border p-5">
              <h3 className="font-medium text-text-primary mb-4">Report a Mistake</h3>
              {/* Project Selector */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={newMistake.projectId}
                  onChange={(e) => setNewMistake(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                >
                  <option value="">Select a project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.company_name || p.client_name || p.client_email} — {p.package}
                    </option>
                  ))}
                </select>
              </div>
              {/* Description */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newMistake.description}
                  onChange={(e) => setNewMistake(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the issue or bug..."
                  rows={4}
                  maxLength={5000}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 resize-none"
                />
              </div>
              {/* Error */}
              {createError && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {createError}
                </div>
              )}
              {/* Submit */}
              <div className="flex justify-end">
                <button
                  onClick={createMistakeHandler}
                  disabled={creating}
                  className="px-5 py-2 bg-[var(--color-accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Report Mistake'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mistakes List */}
      {filteredMistakes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-medium text-text-primary mb-1">
            {filter === 'all' ? 'No mistakes reported' : `No ${statusLabels[filter as MistakeStatus].toLowerCase()} mistakes`}
          </h3>
          <p className="text-sm text-text-muted">
            Mistakes are detected automatically when clients report issues in chat.
          </p>
        </div>
      ) : (
        <RevealGroup stagger={0.04} className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredMistakes.map((mistake) => (
              <RevealItem
                key={mistake.id}
                y={16}
                className="bg-white rounded-xl border border-border overflow-hidden hover:shadow-sm transition-shadow"
              >
                {/* Header */}
                <div
                  className="px-5 py-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === mistake.id ? null : mistake.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[mistake.status]}`}>
                          {statusLabels[mistake.status]}
                        </span>
                        {/* Source Badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${sourceColors[mistake.source]}`}>
                          {mistake.source === 'ai' ? 'AI Detected' : mistake.source === 'client' ? 'Client' : 'Admin'}
                        </span>
                      </div>
                      <h3 className={`font-medium text-text-primary line-clamp-2 ${
                        mistake.status === 'fixed' || mistake.status === 'dismissed' ? 'line-through opacity-60' : ''
                      }`}>
                        {mistake.description.length > 120
                          ? mistake.description.substring(0, 120) + '...'
                          : mistake.description}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                        <span>{mistake.client_name || mistake.client_email}</span>
                        {mistake.company_name && (
                          <>
                            <span>·</span>
                            <span>{mistake.company_name}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{timeAgo(mistake.created_at)}</span>
                      </div>
                    </div>

                    {/* Expand Arrow */}
                    <svg
                      className={`w-5 h-5 text-text-muted transition-transform flex-shrink-0 mt-1 ${expandedId === mistake.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedId === mistake.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 border-t border-border pt-4">
                        {/* Full Description */}
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-text-primary whitespace-pre-wrap">{mistake.description}</p>
                        </div>

                        {/* Actions Row */}
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Status Selector */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-text-muted">Status:</span>
                            <select
                              value={mistake.status}
                              onChange={(e) => updateMistake(mistake.id, e.target.value as MistakeStatus)}
                              disabled={updating === mistake.id}
                              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                            >
                              <option value="open">Open</option>
                              <option value="investigating">Investigating</option>
                              <option value="fixed">Fixed</option>
                              <option value="dismissed">Dismissed</option>
                            </select>
                          </div>

                          <div className="flex-1" />

                          {/* Delete Button */}
                          <Pressable
                            as="button"
                            onClick={() => deleteMistake(mistake.id)}
                            className="text-xs text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </Pressable>
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
