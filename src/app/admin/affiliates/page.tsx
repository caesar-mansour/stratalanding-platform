'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminContent from '../AdminContent';
import { safeExternalHref } from '@/lib/html-utils';
import { Pressable, NumberTicker } from '@/app/admin/_components/motion';
import { toast } from '@/app/admin/_components/Toaster';

interface Conversion {
  id: string;
  commission_cents: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  project_id: string | null;
  company_name: string | null;
  package: string | null;
}

interface Affiliate {
  id: string;
  name: string;
  email: string;
  company: string | null;
  website: string | null;
  referral_code: string;
  status: 'pending' | 'active' | 'paused' | 'rejected';
  paypal_email: string | null;
  total_clicks: number;
  total_conversions: number;
  total_earned_cents: number;
  total_paid_cents: number;
  created_at: string;
  conversions: Conversion[];
}

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; ring: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', ring: 'ring-amber-200' },
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', ring: 'ring-emerald-200' },
  paused: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', ring: 'ring-slate-200' },
  rejected: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400', ring: 'ring-red-200' },
};

const CONV_CFG: Record<string, { bg: string; text: string; icon: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', icon: '~' },
  approved: { bg: 'bg-blue-50', text: 'text-blue-700', icon: '~' },
  paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '~' },
  rejected: { bg: 'bg-red-50', text: 'text-red-600', icon: '~' },
};

const PKG: Record<string, { label: string; color: string }> = {
  starter: { label: 'Presence Page', color: 'text-slate-600' },
  growth: { label: 'Lead Page', color: 'text-blue-600' },
  scale: { label: 'Purchase Page', color: 'text-cyan-600' },
};

function fmt(cents: number) { return `$${(cents / 100).toLocaleString()}`; }

function timeAgo(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Mini progress bar
function ProgressBar({ value, max, color = 'bg-cyan-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0, 0, 0.2, 1] }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'paused'>('all');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [confirmPay, setConfirmPay] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/affiliates');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setAffiliates(data.affiliates);
    } catch {
      setError('Failed to load affiliates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/admin/affiliates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ affiliateId: id, status }) });
      if (!res.ok) throw new Error();
      toast.success(`Affiliate ${status}`);
    } catch {
      toast.error('Something went wrong');
    }
    load();
  };

  const markPaid = async (id: string) => {
    setConfirmPay(null);
    try {
      const res = await fetch('/api/admin/affiliates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversionId: id, markPaid: true }) });
      if (!res.ok) throw new Error();
      toast.success('Commission marked paid');
    } catch {
      toast.error('Something went wrong');
    }
    load();
  };

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`https://stratalanding.com?ref=${code}`);
    setCopyFeedback(code);
    toast.success('Referral link copied');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  // Stats
  const totalEarned = affiliates.reduce((s, a) => s + a.total_earned_cents, 0);
  const totalPaid = affiliates.reduce((s, a) => s + a.total_paid_cents, 0);
  const pendingPayouts = totalEarned - totalPaid;
  const pendingApprovals = affiliates.filter(a => a.status === 'pending').length;
  const activeCount = affiliates.filter(a => a.status === 'active').length;
  const totalClicks = affiliates.reduce((s, a) => s + a.total_clicks, 0);
  const totalConversions = affiliates.reduce((s, a) => s + a.total_conversions, 0);
  const convRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0';
  const filtered = filter === 'all' ? affiliates : affiliates.filter(a => a.status === filter);
  const topAffiliate = [...affiliates].sort((a, b) => b.total_earned_cents - a.total_earned_cents)[0];

  return (
    <AdminContent title="Affiliates" description="Manage partners, approve applications, and process commission payouts.">

      {/* ═══════════ HERO BANNER ═══════════ */}
      <div className="relative rounded-2xl overflow-hidden mb-8" style={{ background: 'linear-gradient(135deg, #0B1B3A 0%, #122548 50%, #0891B2 100%)' }}>
        {/* Dot pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.3) 0%, transparent 70%)' }} />

        <div className="relative z-10 p-8 md:p-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { label: 'Total Earned', node: <NumberTicker value={totalEarned / 100} format="currency" />, sub: `${fmt(totalPaid)} paid`, icon: '~', gradient: 'from-cyan-400 to-blue-500' },
              { label: 'Pending Payout', node: <NumberTicker value={pendingPayouts / 100} format="currency" />, sub: `${pendingApprovals} to approve`, icon: '~', gradient: 'from-amber-400 to-orange-500' },
              { label: 'Active Partners', node: <><NumberTicker value={activeCount} />/{affiliates.length}</>, sub: `${convRate}% conversion`, icon: '~', gradient: 'from-emerald-400 to-teal-500' },
              { label: 'Total Clicks', node: <NumberTicker value={totalClicks} />, sub: `${totalConversions} converted`, icon: '~', gradient: 'from-violet-400 to-purple-500' },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }}>
                <div className="mb-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-lg`}>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {i === 0 && <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                      {i === 1 && <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />}
                      {i === 2 && <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />}
                      {i === 3 && <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />}
                    </svg>
                  </div>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-white mb-0.5">{s.node}</div>
                <div className="text-xs text-white/50">{s.label}</div>
                <div className="text-[11px] text-white/30 mt-0.5">{s.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* Paid / Earned progress bar */}
          {totalEarned > 0 && (
            <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40">Payout progress</span>
                <span className="text-xs text-white/50 font-medium">{fmt(totalPaid)} / {fmt(totalEarned)}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalEarned > 0 ? (totalPaid / totalEarned) * 100 : 0}%` }}
                  transition={{ duration: 1.2, ease: [0, 0, 0.2, 1] }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(to right, #0891B2, #22D3EE)' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ FILTER + SEARCH ═══════════ */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-1 p-1.5 rounded-2xl" style={{ background: '#f1f5f9' }}>
          {(['all', 'pending', 'active', 'paused'] as const).map(f => {
            const count = f === 'all' ? affiliates.length : affiliates.filter(a => a.status === f).length;
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={`relative px-5 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${filter === f ? 'bg-white text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}>
                {f}
                <span className={`ml-1.5 text-xs ${filter === f ? 'text-text-muted' : 'text-text-muted opacity-50'}`}>
                  {count}
                </span>
                {f === 'pending' && pendingApprovals > 0 && filter !== 'pending' && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {pendingApprovals}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {topAffiliate && totalEarned > 0 && (
          <div className="hidden lg:flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200/60">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
              {topAffiliate.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <span className="text-xs text-cyan-700 font-medium">Top performer: </span>
              <span className="text-xs text-cyan-900 font-bold">{topAffiliate.name}</span>
              <span className="text-xs text-cyan-600 ml-1">({fmt(topAffiliate.total_earned_cents)})</span>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ STATES ═══════════ */}
      {loading && (
        <div className="flex flex-col items-center gap-4 py-20">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center">
            <svg className="w-6 h-6 animate-spin text-cyan-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-sm text-text-muted">Loading affiliates...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800">Failed to load</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <button onClick={load} className="ml-auto px-4 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors">Retry</button>
        </div>
      )}

      {!loading && affiliates.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border p-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <svg className="w-9 h-9 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">No affiliates yet</h3>
          <p className="text-sm text-text-muted mb-6 max-w-sm mx-auto">When someone applies through your /partners page, they&apos;ll show up here for review.</p>
          <a href="/partners" target="_blank" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B1B3A] text-white rounded-xl text-sm font-semibold hover:bg-[#0B1B3A]/90 transition-colors shadow-lg shadow-[#0B1B3A]/20">
            View Partners Page
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
      )}

      {/* ═══════════ AFFILIATE CARDS ═══════════ */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((a, idx) => {
            const sc = STATUS_CFG[a.status];
            const isOpen = expanded === a.id;
            const pendingConv = a.conversions.filter(c => c.status === 'pending');
            const paidPct = a.total_earned_cents > 0 ? (a.total_paid_cents / a.total_earned_cents) * 100 : 0;
            const initials = a.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const gradients = ['from-cyan-500 to-blue-600', 'from-violet-500 to-purple-600', 'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600', 'from-rose-500 to-pink-600'];
            const grad = gradients[idx % gradients.length];

            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                className={`bg-white rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'shadow-xl ring-1 ring-border' : 'shadow-sm border border-border hover:shadow-lg hover:border-slate-200'}`}
              >
                {/* ── Header Row ── */}
                <div className="px-6 py-5 cursor-pointer flex items-center gap-5" onClick={() => setExpanded(isOpen ? null : a.id)}>
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg shadow-slate-200`}>
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1">
                      <h3 className="font-bold text-text-primary text-base">{a.name}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${a.status === 'active' ? 'animate-pulse' : ''}`} />
                        {a.status}
                      </span>
                      {pendingConv.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 text-amber-700 text-[11px] font-bold animate-pulse">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12" />
                          </svg>
                          {fmt(pendingConv.reduce((s, c) => s + c.commission_cents, 0))} unpaid
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span className="truncate max-w-[200px]">{a.email}</span>
                      {a.company && <><span className="text-slate-300 hidden sm:inline">|</span><span className="hidden sm:inline">{a.company}</span></>}
                      <span className="text-slate-300 hidden md:inline">|</span>
                      <span className="hidden md:inline">{timeAgo(a.created_at)}</span>
                    </div>
                  </div>

                  {/* Desktop stats mini */}
                  <div className="hidden lg:grid grid-cols-4 gap-6 text-center">
                    {[
                      { v: a.total_clicks, l: 'Clicks', c: 'text-slate-700' },
                      { v: a.total_conversions, l: 'Sales', c: 'text-slate-700' },
                      { v: fmt(a.total_earned_cents), l: 'Earned', c: 'text-cyan-600' },
                      { v: fmt(a.total_paid_cents), l: 'Paid', c: 'text-emerald-600' },
                    ].map(s => (
                      <div key={s.l} className="min-w-[60px]">
                        <div className={`font-bold text-sm ${s.c}`}>{s.v}</div>
                        <div className="text-[10px] text-text-muted uppercase tracking-wider">{s.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {a.status === 'pending' && (
                      <>
                        <Pressable onClick={() => updateStatus(a.id, 'active')} className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl text-xs font-bold hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-md shadow-emerald-200 hover:shadow-lg">
                          Approve
                        </Pressable>
                        <Pressable onClick={() => updateStatus(a.id, 'rejected')} className="px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors">
                          Reject
                        </Pressable>
                      </>
                    )}
                    {a.status === 'active' && (
                      <Pressable onClick={() => updateStatus(a.id, 'paused')} className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">Pause</Pressable>
                    )}
                    {a.status === 'paused' && (
                      <Pressable onClick={() => updateStatus(a.id, 'active')} className="px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors border border-emerald-200">Reactivate</Pressable>
                    )}
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-slate-300 ml-1">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </motion.div>
                  </div>
                </div>

                {/* ── Expanded Panel ── */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="px-6 pb-7">
                        {/* Divider */}
                        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />

                        {/* Detail cards */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                          {/* Referral code */}
                          <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-100">
                            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Referral Code</p>
                            <code className="text-lg font-bold font-mono text-[#0B1B3A] block mb-2">{a.referral_code}</code>
                            <Pressable onClick={() => copyLink(a.referral_code)} className="text-xs font-semibold transition-colors inline-flex items-center gap-1.5">
                              {copyFeedback === a.referral_code ? (
                                <span className="text-emerald-600 flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                  Copied!
                                </span>
                              ) : (
                                <span className="text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                  Copy link
                                </span>
                              )}
                            </Pressable>
                          </div>
                          {/* PayPal */}
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">PayPal</p>
                            <p className="text-sm text-text-primary font-medium truncate">{a.paypal_email || '—'}</p>
                          </div>
                          {/* Website */}
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Website</p>
                            {a.website ? (
                              <a href={safeExternalHref(a.website)} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-600 hover:text-cyan-700 font-medium truncate block hover:underline">{a.website.replace(/^https?:\/\//, '')}</a>
                            ) : (
                              <p className="text-sm text-slate-400">—</p>
                            )}
                          </div>
                          {/* Applied */}
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Applied</p>
                            <p className="text-sm text-text-primary font-medium">{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                          {/* Payout progress */}
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Paid Out</p>
                            <p className="text-sm font-bold text-emerald-600 mb-2">{Math.round(paidPct)}%</p>
                            <ProgressBar value={a.total_paid_cents} max={a.total_earned_cents} color="bg-emerald-500" />
                          </div>
                        </div>

                        {/* Mobile stats */}
                        <div className="grid grid-cols-4 gap-2 mb-6 lg:hidden">
                          {[
                            { l: 'Clicks', v: a.total_clicks, c: '' },
                            { l: 'Sales', v: a.total_conversions, c: '' },
                            { l: 'Earned', v: fmt(a.total_earned_cents), c: 'text-cyan-600' },
                            { l: 'Paid', v: fmt(a.total_paid_cents), c: 'text-emerald-600' },
                          ].map(s => (
                            <div key={s.l} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                              <div className={`font-bold text-sm ${s.c || 'text-text-primary'}`}>{s.v}</div>
                              <div className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">{s.l}</div>
                            </div>
                          ))}
                        </div>

                        {/* Conversions */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">
                              Conversions
                            </h4>
                            <span className="text-xs text-text-muted">{a.conversions.length} total</span>
                          </div>

                          {a.conversions.length === 0 ? (
                            <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-8 text-center border border-dashed border-slate-200">
                              <svg className="w-8 h-8 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                              </svg>
                              <p className="text-sm text-slate-400">No conversions yet</p>
                              <p className="text-xs text-slate-300 mt-1">Commissions appear here after a referred client pays in full</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {a.conversions.map(c => {
                                const cs = CONV_CFG[c.status] || CONV_CFG.pending;
                                const pkg = PKG[c.package || ''] || { label: c.package || 'Unknown', color: 'text-slate-600' };
                                return (
                                  <div key={c.id} className="flex items-center gap-4 bg-gradient-to-r from-slate-50 to-white rounded-xl px-5 py-4 border border-slate-100 hover:border-slate-200 transition-colors group">
                                    {/* Package indicator */}
                                    <div className={`w-1.5 h-10 rounded-full ${c.status === 'paid' ? 'bg-emerald-400' : c.status === 'pending' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm text-text-primary">{c.company_name || 'Unknown project'}</p>
                                      <p className="text-xs text-text-muted flex items-center gap-2 mt-0.5">
                                        <span className={`font-medium ${pkg.color}`}>{pkg.label}</span>
                                        <span className="text-slate-300">·</span>
                                        {timeAgo(c.created_at)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <NumberTicker value={c.commission_cents / 100} format="currency" className="font-bold text-lg text-text-primary" />
                                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${cs.bg} ${cs.text}`}>{c.status}</span>
                                      {c.status === 'pending' && (
                                        <>
                                          {confirmPay === c.id ? (
                                            <div className="flex items-center gap-1.5">
                                              <Pressable onClick={() => markPaid(c.id)} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm">
                                                Confirm
                                              </Pressable>
                                              <Pressable onClick={() => setConfirmPay(null)} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">
                                                Cancel
                                              </Pressable>
                                            </div>
                                          ) : (
                                            <Pressable onClick={() => setConfirmPay(c.id)} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg text-xs font-bold hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-sm opacity-70 group-hover:opacity-100">
                                              Mark Paid
                                            </Pressable>
                                          )}
                                        </>
                                      )}
                                      {c.paid_at && (
                                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                          {new Date(c.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </AdminContent>
  );
}
