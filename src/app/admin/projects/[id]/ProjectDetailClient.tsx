'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { safeExternalHref } from '@/lib/html-utils';
import { NumberTicker, Pressable, CopyButton, Reveal } from '@/app/admin/_components/motion';
import { toast } from '@/app/admin/_components/Toaster';
import { confirmDialog } from '@/app/admin/_components/ConfirmDialog';
import {
  packageLabels,
  packagePricing,
  formatPrice,
  statusInfo,
  milestoneLabels,
  addOnPricing,
  extraRoundsPricing,
  extendedSupportPricing,
  calculateTotalCents,
  type ProjectStatus,
  type PackageType,
  type PackageCustomizations,
  type MilestoneType,
} from '@/lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ProjectDetailData { project: any; payments: any[]; milestones: any[]; tasks: any[]; mistakes: any[]; uploads: any[]; onboarding: any; proposals: any[]; recentMessages: any[]; revisionRoundsUsed: number; priceOverrides: any[]; ceoEmail: string; }

// ─── Section config with icons ───
const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
  { id: 'brief', label: 'Brief', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
  { id: 'onboarding', label: 'Onboarding', icon: 'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18' },
  { id: 'milestones', label: 'Milestones', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
  { id: 'messages', label: 'Messages', icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z' },
  { id: 'tasks', label: 'Tasks', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'mistakes', label: 'Mistakes', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
  { id: 'uploads', label: 'Uploads', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5' },
  { id: 'payments', label: 'Payments', icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z' },
  { id: 'pricing', label: 'Pricing', icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'proposals', label: 'Proposals', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'analytics', label: 'Analytics', icon: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605' },
];

// ─── Status colors with gradient-style backgrounds ───
const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  new: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  proposal_sent: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  deposit_paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  in_production: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  ready_for_final_payment: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  paid_in_full: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  launched: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  not_interested: { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-400' },
};

const priorityStyles: Record<string, { bg: string; text: string; ring: string }> = {
  high: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200' },
  normal: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200' },
  low: { bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-200' },
};

const taskStatusStyles: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

const mistakeStatusStyles: Record<string, { bg: string; text: string }> = {
  open: { bg: 'bg-red-50', text: 'text-red-700' },
  investigating: { bg: 'bg-amber-50', text: 'text-amber-700' },
  fixed: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  dismissed: { bg: 'bg-slate-50', text: 'text-slate-500' },
};

// ─── Animation variants ───
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

// ─── Helpers ───
function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const revisionLimits: Record<string, number> = { starter: 2, growth: 3, scale: 5 };

// ─── Section wrapper ───
function Section({
  id,
  icon,
  title,
  badge,
  actions,
  accent,
  children,
  empty,
}: {
  id: string;
  icon: string;
  title: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  accent: string;
  children?: React.ReactNode;
  empty?: string;
}) {
  const accentMap: Record<string, { iconBg: string; iconText: string; border: string }> = {
    blue: { iconBg: 'bg-sky-50', iconText: 'text-sky-600', border: 'border-l-sky-500' },
    purple: { iconBg: 'bg-violet-50', iconText: 'text-violet-600', border: 'border-l-violet-500' },
    green: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', border: 'border-l-emerald-500' },
    cyan: { iconBg: 'bg-cyan-50', iconText: 'text-cyan-600', border: 'border-l-cyan-500' },
    orange: { iconBg: 'bg-amber-50', iconText: 'text-amber-600', border: 'border-l-amber-500' },
    red: { iconBg: 'bg-red-50', iconText: 'text-red-600', border: 'border-l-red-500' },
    indigo: { iconBg: 'bg-indigo-50', iconText: 'text-indigo-600', border: 'border-l-indigo-500' },
    emerald: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', border: 'border-l-emerald-500' },
    violet: { iconBg: 'bg-violet-50', iconText: 'text-violet-600', border: 'border-l-violet-500' },
    teal: { iconBg: 'bg-teal-50', iconText: 'text-teal-600', border: 'border-l-teal-500' },
  };
  const a = accentMap[accent] || accentMap.blue;

  return (
    <motion.div
      id={id}
      variants={cardVariants}
      className={`bg-white rounded-xl border border-border border-l-[3px] ${a.border} overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow duration-300`}
    >
      <div className="px-5 py-3.5 border-b border-gray-100/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 ${a.iconBg} rounded-lg flex items-center justify-center`}>
            <svg className={`w-4 h-4 ${a.iconText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {badge}
        </div>
        {actions}
      </div>
      {empty && !children ? (
        <div className="px-6 py-10 text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25M12 13.875V7.5M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <p className="text-sm text-gray-400">{empty}</p>
        </div>
      ) : (
        children
      )}
    </motion.div>
  );
}

// ─── Pill badge ───
function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full ${className}`}>
      {children}
    </span>
  );
}

export default function ProjectDetailClient({ data }: { data: ProjectDetailData }) {
  const { project, payments, milestones, tasks, mistakes, uploads, onboarding, proposals, recentMessages, revisionRoundsUsed, priceOverrides: initialOverrides, ceoEmail } = data;
  const brief = project.brief;
  const client = project.client;
  const pkg = project.package as PackageType;
  const revisionLimit = revisionLimits[pkg] || 3;

  // State
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [notes, setNotes] = useState(project.admin_notes || '');
  const [notesSaved, setNotesSaved] = useState(false);
  const [depositUrl, setDepositUrl] = useState(project.deposit_payment_url || '');
  const [finalUrl, setFinalUrl] = useState(project.final_payment_url || '');
  const [previewUrl, setPreviewUrl] = useState(project.preview_url || '');
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [mistakeFilter, setMistakeFilter] = useState<string>('all');
  const [onboardingExpanded, setOnboardingExpanded] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [taskList, setTaskList] = useState(tasks);
  const [mistakeList, setMistakeList] = useState(mistakes);
  const [milestoneList, setMilestoneList] = useState(milestones);
  const [activeSection, setActiveSection] = useState('overview');
  const [priceOverrides, setPriceOverrides] = useState(initialOverrides || []);
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [priceAmount, setPriceAmount] = useState('');
  const [priceReason, setPriceReason] = useState('');
  const [priceRequestedBy, setPriceRequestedBy] = useState('');
  const [priceLoading, setPriceLoading] = useState(false);
  const notesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Intersection observer for active section tracking
  useEffect(() => {
    const sectionIds = SECTIONS.map(s => s.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // ─── Handlers ───
  const updateStatus = async (newStatus: ProjectStatus) => {
    setStatus(newStatus);
    try {
      const r = await fetch('/api/admin/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, status: newStatus }),
      });
      if (!r.ok) throw new Error();
      toast.success('Status updated', statusInfo[newStatus]?.label);
    } catch {
      toast.error('Could not update status');
    }
  };

  const saveNotes = (value: string) => {
    setNotes(value);
    setNotesSaved(false);
    if (notesTimeout.current) clearTimeout(notesTimeout.current);
    notesTimeout.current = setTimeout(async () => {
      try {
        const r = await fetch('/api/admin/notes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id, notes: value }),
        });
        if (!r.ok) throw new Error();
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 2000);
      } catch {
        toast.error('Could not save notes');
      }
    }, 800);
  };

  const saveUrl = async (field: string, value: string) => {
    try {
      const r = await fetch('/api/admin/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, [field]: value }),
      });
      if (!r.ok) throw new Error();
      toast.success('URL saved');
    } catch {
      toast.error('Could not save URL');
    }
  };

  const updateTask = async (taskId: string, field: string, value: string) => {
    setTaskList(prev => prev.map((t: Record<string, unknown>) => t.id === taskId ? { ...t, [field]: value } : t));
    try {
      const r = await fetch('/api/admin/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, [field]: value }),
      });
      if (!r.ok) throw new Error();
    } catch {
      toast.error('Could not update task');
    }
  };

  const updateMistake = async (mistakeId: string, newStatus: string) => {
    setMistakeList(prev => prev.map((m: Record<string, unknown>) => m.id === mistakeId ? { ...m, status: newStatus } : m));
    try {
      const r = await fetch('/api/admin/mistakes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mistakeId, status: newStatus }),
      });
      if (!r.ok) throw new Error();
    } catch {
      toast.error('Could not update mistake');
    }
  };

  const updateMilestone = async (milestoneId: string, newStatus: string) => {
    setMilestoneList(prev => prev.map((m: Record<string, unknown>) => m.id === milestoneId ? { ...m, status: newStatus, ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}) } : m));
    try {
      const r = await fetch('/api/admin/milestones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId, status: newStatus }),
      });
      if (!r.ok) throw new Error();
      toast.success(newStatus === 'completed' ? 'Milestone completed' : 'Milestone started');
    } catch {
      toast.error('Could not update milestone');
    }
  };

  const handleRevision = async (action: 'revert' | 'give') => {
    try {
      const r = await fetch('/api/admin/revisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, action }),
      });
      if (!r.ok) throw new Error();
      toast.success(action === 'give' ? 'Revision round added' : 'Revision round reverted');
    } catch {
      toast.error('Could not update revisions');
    }
    window.location.reload();
  };

  const deleteProject = async () => {
    const { confirmed, checked } = await confirmDialog({
      title: 'Delete this project?',
      message: 'This removes the project and all its data. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
      checkbox: { label: 'Also delete the client account (lets them re-register)', defaultChecked: false },
    });
    if (!confirmed) return;
    const params = new URLSearchParams({ projectId: project.id });
    if (checked) params.set('deleteAccount', 'true');
    await fetch(`/api/admin/projects?${params}`, { method: 'DELETE' });
    window.location.href = '/admin';
  };

  const banEmail = async () => {
    const { confirmed } = await confirmDialog({
      title: `Ban ${client.email}?`,
      message: 'This permanently deletes ALL of their data and blocks the address from re-registering.',
      confirmLabel: 'Ban email',
      tone: 'danger',
    });
    if (!confirmed) return;
    await fetch('/api/admin/banned-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: client.email }),
    });
    window.location.href = '/admin';
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ─── Computed ───
  const filteredTasks = taskFilter === 'all' ? taskList : taskList.filter((t: Record<string, unknown>) => t.status === taskFilter);
  const filteredMistakes = mistakeFilter === 'all' ? mistakeList : mistakeList.filter((m: Record<string, unknown>) => m.status === mistakeFilter);
  const completedMilestones = milestoneList.filter((m: Record<string, unknown>) => m.status === 'completed').length;
  const totalPaid = payments.reduce((sum: number, p: Record<string, unknown>) => sum + ((p.amount_cents as number) || 0), 0);
  const customizations = project.package_customizations as PackageCustomizations | null;
  const approvedOverride = priceOverrides.find((o: Record<string, unknown>) => o.status === 'approved');
  const packageTotal = approvedOverride ? (approvedOverride.override_cents as number) : calculateTotalCents(pkg, customizations);
  const paidPercentage = packageTotal > 0 ? Math.min(100, Math.round((totalPaid / packageTotal) * 100)) : 0;
  const openTasks = taskList.filter((t: Record<string, unknown>) => t.status !== 'completed').length;
  const openMistakes = mistakeList.filter((m: Record<string, unknown>) => m.status === 'open').length;

  const ss = statusStyles[status] || statusStyles.new;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ─── SECTION NAV ─── */}
      <motion.div
        variants={cardVariants}
        className="sticky top-16 z-30 bg-white/80 backdrop-blur-md rounded-xl border border-border px-2 py-1.5 flex gap-0.5 overflow-x-auto shadow-sm"
      >
        {SECTIONS.map(s => {
          const isActive = activeSection === s.id;
          const count =
            s.id === 'tasks' && openTasks > 0 ? openTasks :
            s.id === 'mistakes' && openMistakes > 0 ? openMistakes :
            s.id === 'messages' && recentMessages.length > 0 ? recentMessages.length :
            s.id === 'uploads' && uploads.length > 0 ? uploads.length :
            null;

          return (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'text-[#1A3A5A]'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sectionIndicator"
                  className="absolute inset-0 bg-gradient-to-r from-[#E8F0F8] to-[#9ABCD8]/30 rounded-lg"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <svg className={`relative w-3.5 h-3.5 ${isActive ? 'text-accent' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
              </svg>
              <span className="relative">{s.label}</span>
              {count !== null && (
                <span className={`relative min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full leading-none ${
                  isActive ? 'bg-[#0891B2] text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* ═══════════ OVERVIEW ═══════════ */}
      <motion.div
        id="overview"
        variants={cardVariants}
        className="bg-white rounded-xl border border-border overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
      >
        {/* Gradient accent bar */}
        <div className="h-1 bg-gradient-to-r from-[#3A6A8A] via-[#0891B2] to-[#9ABCD8]" />

        <div className="p-6">
          {/* Top row: Company + Status */}
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Left column */}
            <div className="flex-1 space-y-5">
              {/* Identity */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3A6A8A] to-[#0891B2] flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {(brief?.company_name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary leading-tight">{brief?.company_name || 'Unnamed Project'}</h3>
                  <p className="text-sm text-text-muted mt-0.5">
                    {client.name || 'No name'} &middot;{' '}
                    <a href={`mailto:${client.email}`} className="text-accent hover:underline">{client.email}</a>
                  </p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-[#0891B2]/10 to-[#3A6A8A]/10 text-accent ring-1 ring-[#0891B2]/20">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  {packageLabels[pkg]}
                </span>
                <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-600 ring-1 ring-gray-200">
                  {packageTotal !== packagePricing[pkg] ? formatPrice(packageTotal) : formatPrice(packagePricing[pkg])}
                </span>
                {brief?.industry && (
                  <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-600 ring-1 ring-gray-200">
                    {brief.industry}
                  </span>
                )}
                {project.timeline && (
                  <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-600 ring-1 ring-gray-200">
                    {project.timeline.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              {/* Package Customizations */}
              {customizations && ((Array.isArray(customizations.addOns) && customizations.addOns.length > 0) || customizations.extraRounds !== 'none' || customizations.extendedSupport !== 'none') && (
                <div className="bg-gradient-to-r from-[#0891B2]/5 to-[#3A6A8A]/5 rounded-lg p-3 space-y-2">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Client Extras</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(customizations.addOns) ? customizations.addOns : []).map((a: string) => (
                      <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#0891B2]/10 text-accent">
                        {addOnPricing[a]?.label || a} &middot; {formatPrice(addOnPricing[a]?.priceCents || 0)}
                      </span>
                    ))}
                    {customizations.extraRounds !== 'none' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-violet-50 text-violet-700">
                        {extraRoundsPricing[customizations.extraRounds]?.label} &middot; {formatPrice(extraRoundsPricing[customizations.extraRounds]?.priceCents || 0)}
                      </span>
                    )}
                    {customizations.extendedSupport !== 'none' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-50 text-amber-700">
                        {extendedSupportPricing[customizations.extendedSupport]?.label} &middot; {formatPrice(extendedSupportPricing[customizations.extendedSupport]?.priceCents || 0)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-text-primary">
                    Total: {formatPrice(packageTotal)} <span className="font-normal text-gray-400">(base {formatPrice(packagePricing[pkg])})</span>
                  </p>
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Created', value: new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                  { label: 'Days Active', value: Math.floor((Date.now() - new Date(project.created_at).getTime()) / 86400000).toString(), node: <NumberTicker value={Math.floor((Date.now() - new Date(project.created_at).getTime()) / 86400000)} /> },
                  { label: 'Revisions', value: `${revisionRoundsUsed} / ${revisionLimit}`, warn: revisionRoundsUsed >= revisionLimit },
                  { label: 'Paid', value: totalPaid > 0 ? formatPrice(totalPaid) : '$0', node: <NumberTicker value={totalPaid / 100} format="currency" decimals={totalPaid % 100 === 0 ? 0 : 2} /> },
                ].map(stat => (
                  <div key={stat.label} className="bg-gray-50/80 rounded-lg px-3 py-2.5">
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{stat.label}</p>
                    <p className={`text-sm font-bold mt-0.5 ${(stat as { warn?: boolean }).warn ? 'text-red-600' : 'text-text-primary'}`}>{(stat as { node?: React.ReactNode }).node ?? stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: Status + Notes */}
            <div className="lg:w-80 space-y-4">
              {/* Status */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(statusInfo).map(([key, info]) => {
                    const chosen = pendingStatus || status;
                    const isSelected = key === chosen;
                    const isCurrent = key === status;
                    const s = statusStyles[key] || statusStyles.new;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          if (key === status) {
                            setPendingStatus(null);
                          } else {
                            setPendingStatus(key as ProjectStatus);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg transition-all ${
                          isSelected
                            ? `${s.bg} ${s.text} ring-2 ring-offset-1 ring-current font-semibold`
                            : isCurrent
                              ? `${s.bg} ${s.text} opacity-40`
                              : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected || isCurrent ? s.dot : 'bg-gray-300'}`} />
                        {info.label}
                      </button>
                    );
                  })}
                </div>
                <AnimatePresence>
                  {pendingStatus && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        <p className="text-[12px] text-gray-500 flex-1">
                          <span className="font-medium text-gray-700">{statusInfo[status]?.label}</span>
                          <span className="mx-1.5 text-gray-300">&rarr;</span>
                          <span className="font-semibold text-text-primary">{statusInfo[pendingStatus]?.label}</span>
                        </p>
                        <button
                          onClick={() => setPendingStatus(null)}
                          className="px-2.5 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                        <Pressable
                          disabled={statusSaving}
                          onClick={async () => {
                            setStatusSaving(true);
                            await updateStatus(pendingStatus);
                            setPendingStatus(null);
                            setStatusSaving(false);
                          }}
                          className="px-3 py-1 text-[11px] font-semibold bg-[#0891B2] text-white rounded-md hover:bg-[#0891B2]/90 transition-colors disabled:opacity-50"
                        >
                          {statusSaving ? 'Saving...' : 'Apply'}
                        </Pressable>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Payment progress */}
              {packageTotal > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Payment</span>
                    <span className="text-[11px] font-bold text-text-primary"><NumberTicker value={paidPercentage} format="percent" /></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${paidPercentage}%` }}
                      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                      className={`h-full rounded-full ${paidPercentage >= 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-[#3A6A8A] to-[#0891B2]'}`}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{formatPrice(totalPaid)} of {formatPrice(packageTotal)}</p>
                </div>
              )}

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Admin Notes</label>
                  <AnimatePresence>
                    {notesSaved && (
                      <motion.span
                        initial={{ opacity: 0, x: 4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-[11px] font-semibold text-emerald-600"
                      >
                        Saved
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <textarea
                  value={notes}
                  onChange={e => saveNotes(e.target.value)}
                  rows={3}
                  placeholder="Internal notes about this project..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none transition-all placeholder:text-gray-300"
                />
              </div>
            </div>
          </div>

          {/* URL Fields */}
          <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Deposit Payment URL', value: depositUrl, setter: setDepositUrl, field: 'deposit_payment_url', icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75' },
              { label: 'Final Payment URL', value: finalUrl, setter: setFinalUrl, field: 'final_payment_url', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
              { label: 'Preview URL', value: previewUrl, setter: setPreviewUrl, field: 'preview_url', icon: 'M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25' },
            ].map(f => (
              <div key={f.field}>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">{f.label}</label>
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    value={f.value}
                    onChange={e => f.setter(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] transition-all placeholder:text-gray-300"
                  />
                  <Pressable
                    onClick={() => saveUrl(f.field, f.value)}
                    className="px-3 py-2 text-xs font-semibold bg-[#1A3A5A] text-white rounded-lg hover:bg-[#1A3A5A]/90 transition-colors"
                  >
                    Save
                  </Pressable>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2">
            {project.site_id && (
              <Link href={`/admin/analytics/${project.site_id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 ring-1 ring-teal-200/50 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg>
                Analytics
              </Link>
            )}
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 ring-1 ring-sky-200/50 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                Open Preview
              </a>
            )}
            <div className="flex-1" />
            <button onClick={deleteProject} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              Delete
            </button>
            <button onClick={banEmail} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              Ban Email
            </button>
          </div>
        </div>
      </motion.div>

      {/* ─── Two-Column Grid for Brief + Onboarding ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ═══════════ BRIEF ═══════════ */}
        <Section id="brief" icon={SECTIONS[1].icon} title="Brief Submission" accent="blue" empty={brief ? undefined : 'No brief submitted yet'}>
          {brief ? (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Company', value: brief.company_name },
                { label: 'Website', value: brief.website || 'Not provided', isUrl: !!brief.website },
                { label: 'Industry', value: brief.industry },
                { label: 'Primary Goal', value: brief.primary_goal },
                { label: 'Target Audience', value: brief.audience, full: true },
                { label: 'Pain Points', value: brief.pain_points || 'Not provided', full: true },
                { label: 'Challenge', value: brief.challenge || 'Not provided', full: true },
                { label: 'Notes', value: brief.notes || 'None', full: true },
              ].map(item => (
                <div key={item.label} className={(item as { full?: boolean }).full ? 'sm:col-span-2' : ''}>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{item.label}</p>
                  {(item as { isUrl?: boolean }).isUrl ? (
                    <a href={safeExternalHref(item.value)} target="_blank" rel="noopener" className="text-sm text-accent hover:underline break-all">{item.value}</a>
                  ) : (
                    <p className="text-sm text-text-primary leading-relaxed">{item.value}</p>
                  )}
                </div>
              ))}
            </div>
          ) : undefined}
        </Section>

        {/* ═══════════ ONBOARDING ═══════════ */}
        <Section
          id="onboarding"
          icon={SECTIONS[2].icon}
          title="Onboarding Interview"
          accent="purple"
          badge={onboarding ? (
            <Pill className={onboarding.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>
              {onboarding.status === 'completed' ? 'Completed' : `Q${onboarding.current_question}/10`}
            </Pill>
          ) : undefined}
          actions={onboarding ? (
            <button onClick={() => setOnboardingExpanded(!onboardingExpanded)} className="text-xs font-medium text-accent hover:text-accent/80 transition-colors">
              {onboardingExpanded ? 'Collapse' : 'Expand'}
            </button>
          ) : undefined}
          empty={onboarding ? undefined : 'No onboarding session yet'}
        >
          {onboarding ? (
            <div className="p-5 space-y-4">
              {/* Progress */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Progress</span>
                  <span className="text-[11px] font-bold text-violet-600">{Math.round((onboarding.current_question / 10) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(onboarding.current_question / 10) * 100}%` }}
                    transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full"
                  />
                </div>
              </div>

              {/* Summary */}
              {onboarding.summary && (
                <div className="bg-gradient-to-br from-violet-50 to-purple-50/50 rounded-lg ring-1 ring-violet-100 overflow-hidden">
                  <div className="p-4 pb-0">
                    <p className="text-[11px] font-semibold text-violet-600 uppercase tracking-wider mb-2">AI Summary</p>
                  </div>
                  <div className={`px-4 overflow-hidden transition-all duration-300 ${summaryExpanded ? 'max-h-[2000px] pb-2' : 'max-h-24'}`}>
                    <p className="text-sm text-violet-900 leading-relaxed whitespace-pre-wrap">{typeof onboarding.summary === 'string' ? onboarding.summary : JSON.stringify(onboarding.summary, null, 2)}</p>
                  </div>
                  {!summaryExpanded && (
                    <div className="bg-gradient-to-t from-violet-50 to-transparent h-6 -mt-6 relative" />
                  )}
                  <button
                    onClick={() => setSummaryExpanded(!summaryExpanded)}
                    className="w-full py-2 text-[11px] font-semibold text-violet-600 hover:text-violet-800 hover:bg-violet-100/50 transition-colors border-t border-violet-100/60"
                  >
                    {summaryExpanded ? 'Show less' : 'Show full summary'}
                  </button>
                </div>
              )}

              {/* Q&A */}
              <AnimatePresence>
                {onboardingExpanded && onboarding.messages && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 overflow-hidden max-h-96 overflow-y-auto"
                  >
                    {(onboarding.messages as { id: string; role: string; message: string; question_number: number | null; created_at: string }[]).map((msg) => (
                      <div key={msg.id} className={`p-3 rounded-lg text-sm ${msg.role === 'ai' ? 'bg-cyan-50/60 text-cyan-900 ring-1 ring-cyan-100' : 'bg-gray-50 text-gray-800'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${msg.role === 'ai' ? 'text-cyan-600' : 'text-gray-500'}`}>
                            {msg.role === 'ai' ? 'AI' : 'Client'}
                          </span>
                          {msg.question_number ? <span className="text-[10px] text-gray-400">Q{msg.question_number}</span> : null}
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : undefined}
        </Section>
      </div>

      {/* ═══════════ MILESTONES ═══════════ */}
      <Section
        id="milestones"
        icon={SECTIONS[3].icon}
        title="Milestones"
        accent="green"
        badge={milestoneList.length > 0 ? (
          <Pill className="bg-emerald-50 text-emerald-700">{completedMilestones}/{milestoneList.length}</Pill>
        ) : undefined}
        empty={milestoneList.length === 0 ? undefined : undefined}
      >
        {milestoneList.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" /></svg>
            </div>
            <p className="text-sm text-gray-400 mb-3">No milestones initialized</p>
            <Pressable
              onClick={async () => {
                try {
                  const r = await fetch('/api/admin/milestones', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId: project.id, action: 'initialize' }),
                  });
                  if (!r.ok) throw new Error();
                  toast.success('Milestones initialized');
                } catch {
                  toast.error('Could not initialize milestones');
                }
                window.location.reload();
              }}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Initialize Milestones
            </Pressable>
          </div>
        ) : (
          <div className="p-5">
            {/* Progress */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Progress</span>
              <span className="text-[11px] font-bold text-emerald-600">{Math.round((completedMilestones / milestoneList.length) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(completedMilestones / milestoneList.length) * 100}%` }}
                transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
              />
            </div>

            {/* Visual timeline */}
            <div className="space-y-0">
              {milestoneList.map((m: Record<string, unknown>, i: number) => {
                const type = m.milestone_type as MilestoneType;
                const label = milestoneLabels[type]?.label || type;
                const mStatus = m.status as string;
                const isLast = i === milestoneList.length - 1;

                return (
                  <div key={m.id as string} className="flex gap-3">
                    {/* Timeline column */}
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ring-2 ${
                        mStatus === 'completed' ? 'bg-emerald-500 text-white ring-emerald-200' :
                        mStatus === 'in_progress' ? 'bg-[#0891B2] text-white ring-[#0891B2]/20' :
                        'bg-white text-gray-300 ring-gray-200'
                      }`}>
                        {mStatus === 'completed' ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        ) : mStatus === 'in_progress' ? (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        ) : (
                          <div className="w-2 h-2 bg-gray-200 rounded-full" />
                        )}
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 flex-1 min-h-[24px] ${
                          mStatus === 'completed' ? 'bg-emerald-300' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`flex-1 flex items-center gap-2 pb-3 ${isLast ? '' : ''}`}>
                      <span className={`flex-1 text-sm font-medium ${mStatus === 'completed' ? 'text-gray-400 line-through' : 'text-text-primary'}`}>
                        {label}
                      </span>
                      {mStatus === 'completed' && m.completed_at ? (
                        <span className="text-[10px] text-gray-400">{new Date(m.completed_at as string).toLocaleDateString()}</span>
                      ) : null}
                      {mStatus === 'pending' && (
                        <Pressable onClick={() => updateMilestone(m.id as string, 'in_progress')} className="px-2.5 py-1 text-[11px] font-semibold bg-[#0891B2]/10 text-accent rounded-md hover:bg-[#0891B2]/20 transition-colors">
                          Start
                        </Pressable>
                      )}
                      {mStatus === 'in_progress' && (
                        <Pressable onClick={() => updateMilestone(m.id as string, 'completed')} className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 transition-colors">
                          Complete
                        </Pressable>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* ─── Two-Column Grid for Messages + Tasks ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ═══════════ MESSAGES ═══════════ */}
        <Section
          id="messages"
          icon={SECTIONS[4].icon}
          title="Messages"
          accent="cyan"
          badge={
            <div className="flex items-center gap-2">
              <Pill className="bg-cyan-50 text-cyan-700">{recentMessages.length} msgs</Pill>
              <Pill className={`${revisionRoundsUsed >= revisionLimit ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
                {revisionRoundsUsed}/{revisionLimit} rev
              </Pill>
            </div>
          }
          actions={
            <div className="flex items-center gap-1.5">
              <Pressable onClick={() => handleRevision('give')} className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 transition-colors">+1</Pressable>
              <Pressable onClick={() => handleRevision('revert')} className="px-2 py-1 text-[11px] font-semibold bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition-colors">Undo</Pressable>
              <Link href="/admin/messages" className="px-2 py-1 text-[11px] font-semibold bg-cyan-50 text-cyan-700 rounded-md hover:bg-cyan-100 transition-colors">Full</Link>
            </div>
          }
        >
          {recentMessages.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
              </div>
              <p className="text-sm text-gray-400">No messages yet</p>
            </div>
          ) : (
            <div className="p-3 max-h-80 overflow-y-auto space-y-1.5">
              {recentMessages.slice(-12).map((msg: Record<string, unknown>) => (
                <div key={msg.id as string} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[13px] leading-relaxed ${
                    msg.sender_type === 'admin'
                      ? 'bg-[#1A3A5A] text-white rounded-br-sm'
                      : msg.sender_type === 'ai'
                        ? 'bg-cyan-50 text-cyan-900 ring-1 ring-cyan-100 rounded-bl-sm'
                        : msg.sender_type === 'system'
                          ? 'bg-amber-50/80 text-amber-700 text-[11px] italic w-full text-center rounded-lg'
                          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{(msg.message as string)?.slice(0, 200)}{(msg.message as string)?.length > 200 ? '...' : ''}</p>
                    <p className="text-[10px] opacity-50 mt-1">{timeAgo(msg.created_at as string)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ═══════════ TASKS ═══════════ */}
        <Section
          id="tasks"
          icon={SECTIONS[5].icon}
          title="Tasks"
          accent="orange"
          badge={<Pill className="bg-amber-50 text-amber-700">{taskList.length} total</Pill>}
          actions={
            <div className="flex gap-1">
              {['all', 'pending', 'in_progress', 'completed'].map(f => (
                <button key={f} onClick={() => setTaskFilter(f)} className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${
                  taskFilter === f
                    ? 'bg-[#1A3A5A] text-white'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}>
                  {f === 'all' ? 'All' : f === 'in_progress' ? 'Active' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          }
        >
          {filteredTasks.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm text-gray-400">{taskFilter === 'all' ? 'No tasks' : `No ${taskFilter.replace('_', ' ')} tasks`}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {filteredTasks.map((task: Record<string, unknown>) => {
                const ts = taskStatusStyles[task.status as string] || taskStatusStyles.pending;
                const ps = priorityStyles[task.priority as string] || priorityStyles.normal;
                return (
                  <div key={task.id as string} className="px-4 py-2.5 flex items-center gap-2 hover:bg-gray-50/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text-primary truncate">{task.title as string}</p>
                      {task.description ? <p className="text-[11px] text-gray-400 truncate">{task.description as string}</p> : null}
                    </div>
                    <select
                      value={task.status as string}
                      onChange={e => updateTask(task.id as string, 'status', e.target.value)}
                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md cursor-pointer border-none appearance-none ${ts.bg} ${ts.text}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">Active</option>
                      <option value="completed">Done</option>
                    </select>
                    <select
                      value={task.priority as string}
                      onChange={e => updateTask(task.id as string, 'priority', e.target.value)}
                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md cursor-pointer border-none appearance-none ${ps.bg} ${ps.text}`}
                    >
                      <option value="low">Low</option>
                      <option value="normal">Med</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {/* ─── Two-Column Grid for Mistakes + Uploads ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ═══════════ MISTAKES ═══════════ */}
        <Section
          id="mistakes"
          icon={SECTIONS[6].icon}
          title="Mistakes"
          accent="red"
          badge={openMistakes > 0 ? <Pill className="bg-red-50 text-red-700">{openMistakes} open</Pill> : <Pill className="bg-gray-50 text-gray-500">{mistakeList.length}</Pill>}
          actions={
            <div className="flex gap-1">
              {['all', 'open', 'investigating', 'fixed', 'dismissed'].map(f => (
                <button key={f} onClick={() => setMistakeFilter(f)} className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${
                  mistakeFilter === f
                    ? 'bg-[#1A3A5A] text-white'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          }
        >
          {filteredMistakes.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm text-gray-400">No mistakes reported</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {filteredMistakes.map((m: Record<string, unknown>) => {
                const ms = mistakeStatusStyles[m.status as string] || mistakeStatusStyles.open;
                return (
                  <div key={m.id as string} className="px-4 py-2.5 flex items-center gap-2 hover:bg-gray-50/50 transition-colors">
                    <p className="flex-1 text-[13px] text-text-primary truncate">{m.description as string}</p>
                    <select
                      value={m.status as string}
                      onChange={e => updateMistake(m.id as string, e.target.value)}
                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md cursor-pointer border-none appearance-none ${ms.bg} ${ms.text}`}
                    >
                      <option value="open">Open</option>
                      <option value="investigating">Investigating</option>
                      <option value="fixed">Fixed</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                    <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(m.created_at as string)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ═══════════ UPLOADS ═══════════ */}
        <Section
          id="uploads"
          icon={SECTIONS[7].icon}
          title="Uploads"
          accent="indigo"
          badge={<Pill className="bg-indigo-50 text-indigo-700">{uploads.length} files</Pill>}
          empty={uploads.length === 0 ? 'No files uploaded' : undefined}
        >
          {uploads.length > 0 ? (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {uploads.map((u: Record<string, unknown>) => {
                const isImage = (u.file_type as string)?.startsWith('image/');
                const isPdf = (u.file_type as string) === 'application/pdf';
                return (
                  <div key={u.id as string} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                      isImage ? 'bg-pink-50 text-pink-600' : isPdf ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
                    }`}>
                      {isImage ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                      ) : isPdf ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text-primary truncate">{u.file_name as string}</p>
                      <p className="text-[11px] text-gray-400">{formatFileSize(u.file_size as number)} &middot; {u.category as string}</p>
                    </div>
                    <a
                      href={`/api/uploads/${u.id}/download`}
                      target="_blank"
                      rel="noopener"
                      className="px-2 py-1 text-[11px] font-semibold text-accent bg-cyan-50 rounded-md hover:bg-cyan-100 transition-colors"
                    >
                      Open
                    </a>
                  </div>
                );
              })}
            </div>
          ) : undefined}
        </Section>
      </div>

      {/* ─── Two-Column Grid for Payments + Proposals ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ═══════════ PAYMENTS ═══════════ */}
        <Section
          id="payments"
          icon={SECTIONS[8].icon}
          title="Payments"
          accent="emerald"
          badge={totalPaid > 0 ? <Pill className="bg-emerald-50 text-emerald-700 font-bold">{formatPrice(totalPaid)}</Pill> : undefined}
          empty={payments.length === 0 ? 'No payments recorded' : undefined}
        >
          {payments.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {payments.map((p: Record<string, unknown>) => (
                <div key={p.id as string} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${(p.type as string) === 'deposit' ? 'bg-sky-50' : 'bg-emerald-50'}`}>
                    <svg className={`w-4 h-4 ${(p.type as string) === 'deposit' ? 'text-sky-600' : 'text-emerald-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      {(p.type as string) === 'deposit' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-primary">
                        <NumberTicker value={(p.amount_cents as number) / 100} format="currency" decimals={(p.amount_cents as number) % 100 === 0 ? 0 : 2} />
                      </span>
                      <span className="text-[10px] font-medium text-gray-400 uppercase">{(p.currency as string)?.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Pill className={(p.type as string) === 'deposit' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}>
                        {(p.type as string) === 'deposit' ? 'Deposit' : 'Final'}
                      </Pill>
                      {p.paypal_capture_id ? (
                        <span className="text-[10px] text-gray-400 font-mono truncate max-w-24">{p.paypal_capture_id as string}</span>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">{new Date(p.created_at as string).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : undefined}
        </Section>

        {/* ═══════════ PRICING ═══════════ */}
        <Section
          id="pricing"
          icon={SECTIONS[9].icon}
          title="Pricing"
          accent="amber"
          badge={priceOverrides.some((o: Record<string, unknown>) => o.status === 'pending') ? <Pill className="bg-amber-50 text-amber-700">Pending</Pill> : undefined}
          actions={
            <button
              onClick={() => setShowPriceForm(!showPriceForm)}
              className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
            >
              {showPriceForm ? 'Cancel' : 'Set Custom Price'}
            </button>
          }
        >
          {/* Current effective price */}
          {(() => {
            const standardCents = calculateTotalCents(pkg, project.package_customizations);
            const approvedOverride = priceOverrides.find((o: Record<string, unknown>) => o.status === 'approved');
            const effectiveCents = approvedOverride ? (approvedOverride.override_cents as number) : standardCents;
            const hasOverride = !!approvedOverride;

            return (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Effective Total Price</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      <NumberTicker value={effectiveCents / 100} format="currency" decimals={effectiveCents % 100 === 0 ? 0 : 2} />
                    </p>
                    {hasOverride && (
                      <p className="text-xs text-gray-400 mt-1">
                        Standard: <span className="line-through">{formatPrice(standardCents)}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Deposit (50%)</p>
                    <p className="text-lg font-semibold text-gray-700">
                      <NumberTicker value={Math.round(effectiveCents / 2) / 100} format="currency" decimals={Math.round(effectiveCents / 2) % 100 === 0 ? 0 : 2} />
                    </p>
                  </div>
                </div>

                {/* New override form */}
                <AnimatePresence>
                  {showPriceForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">New Total Price ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="1"
                            value={priceAmount}
                            onChange={(e) => setPriceAmount(e.target.value)}
                            placeholder="e.g. 2000"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-300 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Your Email</label>
                          <input
                            type="email"
                            value={priceRequestedBy}
                            onChange={(e) => setPriceRequestedBy(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-300 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Reason</label>
                          <textarea
                            value={priceReason}
                            onChange={(e) => setPriceReason(e.target.value)}
                            placeholder="e.g. Client negotiated a discount"
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-300 outline-none resize-none"
                          />
                        </div>
                        <Pressable
                          disabled={priceLoading || !priceAmount || !priceRequestedBy}
                          onClick={async () => {
                            setPriceLoading(true);
                            try {
                              const res = await fetch('/api/admin/price-overrides', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  projectId: project.id,
                                  overrideCents: Math.round(parseFloat(priceAmount) * 100),
                                  reason: priceReason,
                                  requestedBy: priceRequestedBy,
                                }),
                              });
                              const result = await res.json();
                              if (res.ok) {
                                // Refresh overrides
                                const listRes = await fetch(`/api/admin/price-overrides?projectId=${project.id}`);
                                const listData = await listRes.json();
                                setPriceOverrides(listData.overrides || []);
                                setShowPriceForm(false);
                                setPriceAmount('');
                                setPriceReason('');
                                toast.success('Price override submitted', result.message);
                              } else {
                                toast.error('Could not create override', result.error);
                              }
                            } catch {
                              toast.error('Failed to create price override');
                            } finally {
                              setPriceLoading(false);
                            }
                          }}
                          className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          {priceLoading ? 'Submitting...' : 'Submit Price Override'}
                        </Pressable>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Override history */}
                {priceOverrides.length > 0 && (
                  <div className="divide-y divide-gray-50">
                    {priceOverrides.map((o: Record<string, unknown>) => {
                      const oStatus = o.status as string;
                      const statusStyle =
                        oStatus === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                        oStatus === 'pending' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700';
                      return (
                        <div key={o.id as string} className="px-4 py-3 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${oStatus === 'approved' ? 'bg-emerald-50' : oStatus === 'pending' ? 'bg-amber-50' : 'bg-red-50'}`}>
                            <svg className={`w-4 h-4 ${oStatus === 'approved' ? 'text-emerald-600' : oStatus === 'pending' ? 'text-amber-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{formatPrice(o.override_cents as number)}</span>
                              <span className="text-xs text-gray-400">from {formatPrice(o.original_cents as number)}</span>
                              <Pill className={statusStyle}>{oStatus}</Pill>
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {o.reason as string || 'No reason'} — by {o.requested_by as string}
                            </p>
                          </div>
                          {oStatus === 'pending' && (
                            <span className="text-xs text-amber-600 font-medium whitespace-nowrap">Awaiting CEO</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </Section>

        {/* ═══════════ PROPOSALS ═══════════ */}
        <Section
          id="proposals"
          icon={SECTIONS[10].icon}
          title="Proposals"
          accent="violet"
          actions={<Link href="/admin/proposals" className="text-xs font-medium text-accent hover:text-accent/80 transition-colors">Manage</Link>}
          empty={proposals.length === 0 ? 'No proposals sent' : undefined}
        >
          {proposals.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {proposals.map((pr: Record<string, unknown>) => {
                const prStatus = pr.status as string;
                const prStatusStyle =
                  prStatus === 'accepted' ? 'bg-emerald-50 text-emerald-700' :
                  prStatus === 'sent' ? 'bg-sky-50 text-sky-700' :
                  prStatus === 'viewed' ? 'bg-violet-50 text-violet-700' :
                  prStatus === 'expired' ? 'bg-red-50 text-red-700' :
                  'bg-gray-50 text-gray-600';

                return (
                  <div key={pr.id as string} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                      <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary">
                          {pr.custom_price_cents ? formatPrice(pr.custom_price_cents as number) : formatPrice(packagePricing[(pr.package as PackageType)])}
                        </span>
                        <Pill className="bg-violet-50 text-violet-700">
                          {packageLabels[(pr.package as PackageType)] || pr.package as string}
                        </Pill>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Pill className={prStatusStyle}>{prStatus}</Pill>
                        {pr.valid_until ? (
                          <span className="text-[10px] text-gray-400">Valid until {new Date(pr.valid_until as string).toLocaleDateString()}</span>
                        ) : null}
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0">{new Date(pr.created_at as string).toLocaleDateString()}</span>
                  </div>
                );
              })}
            </div>
          ) : undefined}
        </Section>
      </div>

      {/* ═══════════ ANALYTICS ═══════════ */}
      <Section
        id="analytics"
        icon={SECTIONS[11].icon}
        title="Analytics"
        accent="teal"
        empty={project.site_id ? undefined : 'No analytics site ID configured for this project'}
      >
        {project.site_id ? (
          <Reveal className="p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Embed Script</p>
                <CopyButton
                  value={`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/analytics/script?id=${project.site_id}" defer></script>`}
                  label="Copy"
                  size={14}
                  className="text-[11px]"
                />
              </div>
              <div className="bg-[#0f172a] rounded-lg p-3.5 text-xs text-emerald-400 font-mono overflow-x-auto ring-1 ring-white/5">
                <span className="text-gray-500">&lt;</span>
                <span className="text-sky-400">script</span>
                <span className="text-gray-500"> </span>
                <span className="text-violet-400">src</span>
                <span className="text-gray-500">=&quot;</span>
                <span className="text-emerald-400">{typeof window !== 'undefined' ? window.location.origin : ''}/api/analytics/script?id={project.site_id}</span>
                <span className="text-gray-500">&quot; </span>
                <span className="text-violet-400">defer</span>
                <span className="text-gray-500">&gt;&lt;/</span>
                <span className="text-sky-400">script</span>
                <span className="text-gray-500">&gt;</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/analytics/${project.site_id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-lg hover:from-teal-700 hover:to-teal-600 transition-all shadow-sm shadow-teal-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg>
                View Dashboard
              </Link>
              <CopyButton value={String(project.site_id)} label={String(project.site_id)} size={13} className="text-xs font-mono text-gray-400" />
            </div>
          </Reveal>
        ) : undefined}
      </Section>

      {/* Project ID footer */}
      <div className="flex justify-center pb-4">
        <CopyButton value={String(project.id)} label={String(project.id)} size={12} className="text-[11px] font-mono text-gray-300" />
      </div>
    </motion.div>
  );
}
