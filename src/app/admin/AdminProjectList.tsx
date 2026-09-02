'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import type { ProjectStatus, PackageType } from '@/lib/types';
import { Pressable, NumberTicker, CopyButton, Pulse } from '@/app/admin/_components/motion';
import { toast } from '@/app/admin/_components/Toaster';

interface ProjectWithClient {
  id: string;
  status: ProjectStatus;
  package: PackageType;
  timeline: string;
  deposit_payment_url: string | null;
  final_payment_url: string | null;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
  clients: {
    id: string;
    email: string;
    name: string | null;
  };
  brief_submissions: {
    company_name: string;
    industry: string | null;
    notes: string | null;
  }[];
  site_id?: string | null;
  admin_notes?: string | null;
  package_customizations?: {
    addOns: string[];
    extraRounds: string;
    extendedSupport: string;
    totalEstimate: number;
    updatedAt: string;
  } | null;
}

// Demo name mapping for display
const demoNames: Record<string, string> = {
  'local-service-leads': 'Local Service Lead Gen',
  'saas-waitlist': 'SaaS Waitlist',
  'agency-niche': 'Agency Niche',
  'ecommerce-product': 'Ecommerce Product',
  'mobile-app': 'Mobile App Launch',
  'online-course': 'Online Course',
  'fitness-gym': 'Fitness / Gym',
  'restaurant': 'Restaurant / Food',
  'real-estate': 'Real Estate Agent',
  'webinar': 'Webinar / Event',
  'dental-practice': 'Dental Practice',
  'law-firm': 'Law Firm',
  'life-coach': 'Life Coach',
  'podcast': 'Podcast',
  'nonprofit': 'Nonprofit',
  'crypto-web3': 'Crypto / Web3',
  'photography': 'Photography Studio',
  'pet-services': 'Pet Services',
  'insurance': 'Insurance Agency',
  'home-services': 'Home Services',
  'fashion-brand': 'Fashion Brand',
  'financial-advisor': 'Financial Advisor',
  'wedding-planner': 'Wedding Planner',
  'coworking': 'Coworking Space',
  'moving-company': 'Moving Company',
  'music-school': 'Music School',
  'roofing': 'Roofing Contractor',
  'therapy': 'Therapy Practice',
  'supplements': 'Supplements Brand',
  'solar-energy': 'Solar Energy',
};

// Helper to extract demo reference from notes (stored as [Demo: xxx])
const extractDemoFromNotes = (notes: string | null): string | null => {
  if (!notes) return null;
  const match = notes.match(/^\[Demo: ([^\]]+)\]/);
  return match ? match[1] : null;
};

// Helper to get notes without the demo prefix
const getNotesWithoutDemo = (notes: string | null): string | null => {
  if (!notes) return null;
  return notes.replace(/^\[Demo: [^\]]+\]\s*/, '').trim() || null;
};

const statusLabels: Record<ProjectStatus, string> = {
  new: 'New',
  proposal_sent: 'Proposal Sent',
  deposit_paid: 'Deposit Paid',
  in_production: 'In Production',
  ready_for_final_payment: 'Ready for Final',
  paid_in_full: 'Paid in Full',
  launched: 'Launched',
  not_interested: 'Not Interested',
};

const statusColors: Record<ProjectStatus, string> = {
  new: 'bg-gray-100 text-gray-800',
  proposal_sent: 'bg-blue-100 text-blue-800',
  deposit_paid: 'bg-green-100 text-green-800',
  in_production: 'bg-yellow-100 text-yellow-800',
  ready_for_final_payment: 'bg-orange-100 text-orange-800',
  paid_in_full: 'bg-emerald-100 text-emerald-800',
  launched: 'bg-purple-100 text-purple-800',
  not_interested: 'bg-red-100 text-red-800',
};

const packageLabels: Record<PackageType, string> = {
  starter: 'Presence Page',
  growth: 'Lead Page',
  scale: 'Purchase Page',
};

// Check if project was created in last 24 hours
const isNewProject = (createdAt: string): boolean => {
  const created = new Date(createdAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  return hoursDiff < 24;
};

// Admin notes persisted to database via API
const saveAdminNotesToDB = async (projectId: string, notes: string) => {
  try {
    await fetch('/api/admin/notes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, notes }),
    });
  } catch (error) {
    console.error('Failed to save admin notes:', error);
    toast.error('Could not save notes');
  }
};

export default function AdminProjectList({ projects }: { projects: ProjectWithClient[] }) {
  const [selectedProject, setSelectedProject] = useState<ProjectWithClient | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [adminNotesValue, setAdminNotesValue] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const response = await fetch('/api/admin/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast.success('Status updated', statusLabels[newStatus]);
      // Refresh the page to get updated data
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed';
      setUpdateError(message);
      toast.error('Status update failed', message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProject = async (projectId: string, deleteAccount = false) => {
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const params = new URLSearchParams({ projectId });
      if (deleteAccount) params.set('deleteAccount', 'true');

      const response = await fetch(`/api/admin/projects?${params}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      toast.success('Project deleted');
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      setUpdateError(message);
      toast.error('Delete failed', message);
      setIsUpdating(false);
    }
  };

  const handleBanEmail = async (email: string) => {
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const response = await fetch('/api/admin/banned-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to ban email');
      }

      toast.success('Email banned', email);
      setShowBanConfirm(false);
      setSelectedProject(null);
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ban failed';
      setUpdateError(message);
      toast.error('Ban failed', message);
      setIsUpdating(false);
    }
  };

  const handlePaymentUrlUpdate = async (
    projectId: string,
    field: 'deposit_payment_url' | 'final_payment_url' | 'preview_url',
    url: string
  ) => {
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const response = await fetch('/api/admin/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, [field]: url }),
      });

      if (!response.ok) {
        throw new Error('Failed to update payment URL');
      }

      toast.success('Saved');
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed';
      setUpdateError(message);
      toast.error('Save failed', message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (projects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-dashed border-white/60 bg-white/55 backdrop-blur-md p-12 text-center shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-text-muted ring-1 ring-white/60">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z" />
          </svg>
        </div>
        <p className="text-text-muted">No projects yet.</p>
      </motion.div>
    );
  }

  return (
    <>
      {/* Projects Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md overflow-hidden shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
      >
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-background">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Industry
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Package
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {projects.map((project, index) => {
              const isNew = isNewProject(project.created_at);
              return (
                <motion.tr
                  key={project.id}
                  initial={index > 12 ? false : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: Math.min(index * 0.04, 0.4),
                    type: 'spring',
                    stiffness: 300,
                    damping: 25,
                  }}
                  whileHover={{
                    backgroundColor: 'rgba(8, 145, 178, 0.04)',
                    transition: { duration: 0.15 },
                  }}
                  className="group cursor-pointer relative"
                  onClick={() => {
                    setSelectedProject(project);
                    setAdminNotesValue(project.admin_notes || '');
                    setNotesSaved(false);
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* New project indicator */}
                    {isNew && (
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-r"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: index * 0.05 + 0.2 }}
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <motion.span
                        className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors"
                        whileHover={{ x: 2 }}
                      >
                        {project.brief_submissions?.[0]?.company_name || 'N/A'}
                      </motion.span>
                      {isNew && (
                        <motion.span
                          className="px-1.5 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, delay: index * 0.05 + 0.3 }}
                        >
                          NEW
                        </motion.span>
                      )}
                      {extractDemoFromNotes(project.brief_submissions?.[0]?.notes) && (
                        <motion.span
                          className="w-2 h-2 bg-purple-500 rounded-full"
                          title="Has demo selected"
                          whileHover={{ scale: 1.5 }}
                        />
                      )}
                      {getNotesWithoutDemo(project.brief_submissions?.[0]?.notes) && (
                        <motion.span
                          className="w-2 h-2 bg-blue-500 rounded-full"
                          title="Has project notes"
                          whileHover={{ scale: 1.5 }}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm text-text-primary">{project.clients.name || 'N/A'}</p>
                      <p className="text-sm text-text-muted">{project.clients.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-text-muted">
                      {project.brief_submissions?.[0]?.industry || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <motion.span
                      className="text-sm text-text-primary inline-block"
                      whileHover={{ scale: 1.02 }}
                    >
                      {packageLabels[project.package]}
                    </motion.span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <motion.span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[project.status]}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.05 + 0.1, type: 'spring', stiffness: 400 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      {(project.status === 'in_production' || project.status === 'new') ? (
                        <Pulse><span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current" /></Pulse>
                      ) : (
                        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                      )}
                      {statusLabels[project.status]}
                    </motion.span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                    {new Date(project.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Pressable
                      as="a"
                      href={`/admin/projects/${project.id}`}
                      className="inline-flex text-sm text-accent hover:opacity-70 transition-opacity font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Details →
                    </Pressable>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.9 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary">
                  {selectedProject.brief_submissions?.[0]?.company_name || 'Project Details'}
                </h3>
                <Pressable
                  ariaLabel="Close"
                  onClick={() => {
                    setSelectedProject(null);
                    setShowDeleteConfirm(false);
                    setShowBanConfirm(false);
                  }}
                  className="inline-flex text-text-muted hover:text-text-primary"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Pressable>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {updateError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {updateError}
                </div>
              )}

              {/* Client Info */}
              <div>
                <h4 className="text-sm font-medium text-text-muted mb-2">Client</h4>
                <p className="text-text-primary">{selectedProject.clients.name || 'N/A'}</p>
                <div className="flex items-center gap-2">
                  <p className="text-text-muted">{selectedProject.clients.email}</p>
                  <CopyButton value={selectedProject.clients.email} label="" />
                </div>
              </div>

              {/* Package */}
              <div>
                <h4 className="text-sm font-medium text-text-muted mb-2">Package</h4>
                <p className="text-text-primary">{packageLabels[selectedProject.package]}</p>
              </div>

              {/* Package Customizations */}
              <div>
                <h4 className="text-sm font-medium text-text-muted mb-2">Package Customizations</h4>
                {selectedProject.package_customizations ? (() => {
                  const c = selectedProject.package_customizations;
                  const addOnLabels: Record<string, { name: string; price: number }> = {
                    copy: { name: 'Copywriting', price: 500 },
                    rush: { name: 'Rush Delivery', price: 750 },
                    photos: { name: 'Stock Photos', price: 200 },
                    seo: { name: 'SEO Setup', price: 400 },
                  };
                  const extraRoundsLabels: Record<string, string> = {
                    'none': '', 'rev-1': '+1 revision round ($150)', 'rev-5': '+5 revision rounds ($500)',
                  };
                  const extendedLabels: Record<string, string> = {
                    'none': '', 'ext-1mo': '+1 month ($300)', 'ext-3mo': '+3 months ($750)', 'ext-6mo': '+6 months ($1,200)', 'ext-1yr': '+1 year ($2,000)',
                  };
                  const hasAddOns = c.addOns && c.addOns.length > 0;
                  const hasExtras = c.extraRounds !== 'none';
                  const hasExtended = c.extendedSupport !== 'none';
                  const hasAnything = hasAddOns || hasExtras || hasExtended;

                  return hasAnything ? (
                    <div className="bg-background rounded-lg border border-border p-4 space-y-3">
                      {hasAddOns && (
                        <div>
                          <p className="text-xs font-medium text-text-muted mb-1.5">Add-ons</p>
                          <div className="flex flex-wrap gap-1.5">
                            {c.addOns.map((id: string) => {
                              const info = addOnLabels[id];
                              return info ? (
                                <span key={id} className="inline-flex px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                                  {info.name} +${info.price}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                      {hasExtras && (
                        <div>
                          <p className="text-xs font-medium text-text-muted mb-1">Extra Rounds</p>
                          <span className="text-sm text-text-primary">{extraRoundsLabels[c.extraRounds]}</span>
                        </div>
                      )}
                      {hasExtended && (
                        <div>
                          <p className="text-xs font-medium text-text-muted mb-1">Extended Support</p>
                          <span className="text-sm text-text-primary">{extendedLabels[c.extendedSupport]}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-dashed border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-text-primary">Estimated Total</span>
                          <span className="text-lg font-bold text-accent">
                            <NumberTicker value={c.totalEstimate} format="currency" />
                          </span>
                        </div>
                        <p className="text-[10px] text-text-muted mt-1">
                          Last updated {new Date(c.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">Client selected no extras</p>
                  );
                })() : (
                  <p className="text-sm text-text-muted italic">No customizations yet</p>
                )}
              </div>

              {/* Industry */}
              {selectedProject.brief_submissions?.[0]?.industry && (
                <div>
                  <h4 className="text-sm font-medium text-text-muted mb-2">Industry</h4>
                  <span className="inline-flex px-3 py-1 bg-background text-text-primary text-sm rounded-full border border-border">
                    {selectedProject.brief_submissions[0].industry}
                  </span>
                </div>
              )}

              {/* Demo Reference */}
              {extractDemoFromNotes(selectedProject.brief_submissions?.[0]?.notes) && (
                <div>
                  <h4 className="text-sm font-medium text-text-muted mb-2">Selected Demo</h4>
                  <span className="inline-flex px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-full border border-purple-200">
                    {demoNames[extractDemoFromNotes(selectedProject.brief_submissions[0].notes)!] || extractDemoFromNotes(selectedProject.brief_submissions[0].notes)}
                  </span>
                </div>
              )}

              {/* Client Project Notes */}
              {getNotesWithoutDemo(selectedProject.brief_submissions?.[0]?.notes) && (
                <div>
                  <h4 className="text-sm font-medium text-text-muted mb-2">Client Notes</h4>
                  <div className="bg-background rounded-lg border border-border p-4">
                    <p className="text-sm text-text-primary whitespace-pre-wrap">
                      {getNotesWithoutDemo(selectedProject.brief_submissions[0].notes)}
                    </p>
                  </div>
                </div>
              )}

              {/* Admin Internal Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-text-muted">Internal Notes (Admin Only)</h4>
                  {notesSaved && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Saved
                    </span>
                  )}
                </div>
                <textarea
                  value={adminNotesValue}
                  onChange={(e) => {
                    setAdminNotesValue(e.target.value);
                    setNotesSaved(false);
                  }}
                  onBlur={() => {
                    saveAdminNotesToDB(selectedProject.id, adminNotesValue);
                    setNotesSaved(true);
                    setTimeout(() => setNotesSaved(false), 2000);
                  }}
                  placeholder="Add internal notes about this project..."
                  className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-text-primary text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent min-h-[100px] resize-y"
                />
                <p className="text-xs text-text-muted mt-1">
                  These notes are only visible to you and are saved automatically
                </p>
              </div>

              {/* Status Update */}
              <div>
                <h4 className="text-sm font-medium text-text-muted mb-2">Status</h4>
                <select
                  value={selectedProject.status}
                  onChange={(e) => handleStatusChange(selectedProject.id, e.target.value as ProjectStatus)}
                  disabled={isUpdating}
                  className="w-full px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent"
                >
                  <option value="new">New</option>
                  <option value="proposal_sent">Proposal Sent</option>
                  <option value="deposit_paid">Deposit Paid</option>
                  <option value="in_production">In Production</option>
                  <option value="ready_for_final_payment">Ready for Final Payment</option>
                  <option value="paid_in_full">Paid in Full</option>
                  <option value="launched">Launched</option>
                  <option value="not_interested">Not Interested</option>
                </select>
              </div>

              {/* Payment URLs */}
              <div>
                <h4 className="text-sm font-medium text-text-muted mb-2">Deposit Payment URL</h4>
                <div className="flex gap-2">
                  <input
                    type="url"
                    defaultValue={selectedProject.deposit_payment_url || ''}
                    placeholder="https://www.paypal.com/paypalme/..."
                    className="flex-1 px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    id={`deposit-url-${selectedProject.id}`}
                  />
                  <Pressable
                    onClick={() => {
                      const input = document.getElementById(`deposit-url-${selectedProject.id}`) as HTMLInputElement;
                      handlePaymentUrlUpdate(selectedProject.id, 'deposit_payment_url', input.value);
                    }}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-text-primary text-surface rounded-[var(--radius-md)] hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    Save
                  </Pressable>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-text-muted mb-2">Final Payment URL</h4>
                <div className="flex gap-2">
                  <input
                    type="url"
                    defaultValue={selectedProject.final_payment_url || ''}
                    placeholder="https://www.paypal.com/paypalme/..."
                    className="flex-1 px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    id={`final-url-${selectedProject.id}`}
                  />
                  <Pressable
                    onClick={() => {
                      const input = document.getElementById(`final-url-${selectedProject.id}`) as HTMLInputElement;
                      handlePaymentUrlUpdate(selectedProject.id, 'final_payment_url', input.value);
                    }}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-text-primary text-surface rounded-[var(--radius-md)] hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    Save
                  </Pressable>
                </div>
              </div>

              {/* Preview URL */}
              <div>
                <h4 className="text-sm font-medium text-text-muted mb-2">Preview URL (Client Visible)</h4>
                <div className="flex gap-2">
                  <input
                    type="url"
                    defaultValue={selectedProject.preview_url || ''}
                    placeholder="https://project-preview.vercel.app"
                    className="flex-1 px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    id={`preview-url-${selectedProject.id}`}
                  />
                  <Pressable
                    onClick={() => {
                      const input = document.getElementById(`preview-url-${selectedProject.id}`) as HTMLInputElement;
                      handlePaymentUrlUpdate(selectedProject.id, 'preview_url', input.value);
                    }}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-text-primary text-surface rounded-[var(--radius-md)] hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    Save
                  </Pressable>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Staging/Vercel URL for the client to preview their landing page
                </p>
              </div>

              {/* Analytics Tracking */}
              {selectedProject.site_id && (
                <div>
                  <h4 className="text-sm font-medium text-text-muted mb-2">Analytics Tracking</h4>
                  <p className="text-xs text-text-muted mb-2">
                    Add this to the client&apos;s landing page &lt;head&gt; tag to enable analytics.
                  </p>
                  <div className="relative">
                    <pre className="text-xs bg-background border border-border rounded-[var(--radius-md)] p-3 overflow-x-auto whitespace-pre-wrap break-all text-text-muted">
                      {`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/analytics/script?id=${selectedProject.site_id}" defer></script>`}
                    </pre>
                    <CopyButton
                      value={`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/analytics/script?id=${selectedProject.site_id}" defer></script>`}
                      className="absolute top-2 right-2 px-2 py-1 text-xs bg-text-primary !text-surface rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity hover:!text-surface"
                      size={14}
                    />
                  </div>
                  <Pressable
                    as="a"
                    href={`/admin/analytics/${selectedProject.site_id}`}
                    className="inline-flex items-center gap-1 mt-2 text-sm text-accent hover:underline"
                  >
                    View Analytics →
                  </Pressable>
                </div>
              )}

              {/* Project ID */}
              <div>
                <h4 className="text-sm font-medium text-text-muted mb-2">Project ID</h4>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-text-muted bg-background px-2 py-1 rounded-[var(--radius-sm)]">
                    {selectedProject.id}
                  </code>
                  <CopyButton value={selectedProject.id} label="" />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-border space-y-3">
                <AnimatePresence mode="wait">
                  {/* Ban Email */}
                  {!showBanConfirm && !showDeleteConfirm && (
                    <motion.div
                      key="action-buttons"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-3"
                    >
                      <Pressable
                        onClick={() => setShowBanConfirm(true)}
                        disabled={isUpdating}
                        className="block w-full px-4 py-2 text-center text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 disabled:opacity-50 transition-colors"
                      >
                        Ban Email
                      </Pressable>
                      <Pressable
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isUpdating}
                        className="block w-full px-4 py-2 text-center text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        Delete Project
                      </Pressable>
                    </motion.div>
                  )}

                  {showBanConfirm && (
                    <motion.div
                      key="ban-confirm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-orange-50 border border-orange-200 rounded-lg p-4"
                    >
                      <p className="text-sm text-orange-800 mb-3">
                        <strong>Ban {selectedProject.clients.email}?</strong>
                      </p>
                      <p className="text-sm text-orange-700 mb-3">
                        This will permanently delete their account, all projects, and all data. They will be blocked from submitting new briefs with this email.
                      </p>
                      <div className="flex gap-2">
                        <Pressable
                          onClick={() => setShowBanConfirm(false)}
                          disabled={isUpdating}
                          className="flex-1 px-4 py-2 text-center text-text-muted border border-border rounded-[var(--radius-md)] hover:bg-background disabled:opacity-50 transition-colors"
                        >
                          Cancel
                        </Pressable>
                        <Pressable
                          onClick={() => handleBanEmail(selectedProject.clients.email)}
                          disabled={isUpdating}
                          className="flex-1 px-4 py-2 text-center bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                        >
                          {isUpdating ? 'Banning...' : 'Yes, Ban'}
                        </Pressable>
                      </div>
                    </motion.div>
                  )}

                  {showDeleteConfirm && (
                    <motion.div
                      key="delete-confirm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-red-50 border border-red-200 rounded-lg p-4"
                    >
                      <p className="text-sm text-red-800 mb-3">
                        Are you sure you want to delete this project? This action cannot be undone.
                      </p>
                      <div className="flex flex-col gap-2">
                        <Pressable
                          onClick={() => handleDeleteProject(selectedProject.id, true)}
                          disabled={isUpdating}
                          className="block w-full px-4 py-2 text-center bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
                        >
                          {isUpdating ? 'Deleting...' : 'Delete Project + Account'}
                        </Pressable>
                        <Pressable
                          onClick={() => handleDeleteProject(selectedProject.id, false)}
                          disabled={isUpdating}
                          className="block w-full px-4 py-2 text-center bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors text-sm"
                        >
                          {isUpdating ? 'Deleting...' : 'Delete Project Only'}
                        </Pressable>
                        <Pressable
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={isUpdating}
                          className="block w-full px-4 py-2 text-center text-text-muted border border-border rounded-[var(--radius-md)] hover:bg-background disabled:opacity-50 transition-colors text-sm"
                        >
                          Cancel
                        </Pressable>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
