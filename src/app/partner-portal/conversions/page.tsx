'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  GradientText,
  Reveal,
  RevealGroup,
  RevealItem,
  NumberTicker,
} from '@/app/portal/components/portal-ui';

interface Conversion {
  id: string;
  commission_cents: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  company_name: string | null;
  package: string | null;
}

const PKG: Record<string, string> = { starter: 'Presence Page', growth: 'Lead Page', scale: 'Purchase Page' };
function fmt(c: number) { return `$${(c / 100).toLocaleString()}`; }

const GLASS = "rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]";

export default function ConversionsPage() {
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

  useEffect(() => {
    fetch('/api/partner-portal').then(r => r.json()).then(d => {
      setConversions(d.conversions || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? conversions : conversions.filter(c => c.status === filter);
  const totalFiltered = filtered.reduce((s, c) => s + c.commission_cents, 0);

  const totalAll = conversions.reduce((s, c) => s + c.commission_cents, 0);
  const totalPaid = conversions.filter(c => c.status === 'paid').reduce((s, c) => s + c.commission_cents, 0);
  const totalPending = conversions.filter(c => c.status === 'pending').reduce((s, c) => s + c.commission_cents, 0);

  return (
    <div className="space-y-6">
        {/* Page header */}
        <Reveal>
          <div>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight">
              <GradientText from="#0B1B3A" to="#0891B2">Conversions</GradientText>
            </h1>
            <p className="text-sm text-text-muted mt-1">Every referred client that converted into a paying project.</p>
          </div>
        </Reveal>

        {/* Filter + total */}
        <Reveal delay={0.04}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-1 p-1.5 rounded-2xl border border-white/70 bg-white/60 backdrop-blur-md">
              {(['all', 'pending', 'paid'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]/45 ${filter === f ? 'bg-gradient-to-b from-white/95 to-[#22D3EE]/[0.09] text-[#0B1B3A] ring-1 ring-[#22D3EE]/35 shadow-[0_4px_16px_-4px_rgba(8,145,178,0.28)]' : 'text-text-muted hover:text-[#0B1B3A]'}`}>
                  {f} ({f === 'all' ? conversions.length : conversions.filter(c => c.status === f).length})
                </button>
              ))}
            </div>
            <div className="text-sm text-text-muted">Total:{' '}
              <span className="font-bold text-[var(--color-accent)]">
                <NumberTicker value={totalFiltered / 100} format="currency" decimals={0} />
              </span>
            </div>
          </div>
        </Reveal>

        {/* Summary */}
        <RevealGroup className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: 'Total', value: totalAll, color: 'text-[var(--color-accent)]' },
            { label: 'Paid', value: totalPaid, color: 'text-emerald-600' },
            { label: 'Pending', value: totalPending, color: 'text-amber-600' },
          ].map((s) => (
            <RevealItem key={s.label}>
              <div className={GLASS + ' p-5'}>
                <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">{s.label}</div>
                <div className={`text-2xl font-bold ${s.color}`}>
                  <NumberTicker value={s.value / 100} format="currency" decimals={0} />
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>

        {/* List */}
        <Reveal delay={0.08}>
          <div className={GLASS + " overflow-hidden"}>
            {loading ? (
              <div className="p-12 text-center text-text-muted text-sm">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/60 bg-white/70 text-[var(--color-accent)] shadow-[0_6px_20px_-10px_rgba(11,27,58,0.25)] backdrop-blur-md mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold">
                  <GradientText from="#0B1B3A" to="#0891B2">
                    No conversions {filter !== 'all' ? `with status "${filter}"` : 'yet'}
                  </GradientText>
                </h3>
                <p className="text-sm text-text-muted mt-1">Share your referral link to start earning commissions.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 transition-colors hover:bg-[#0B1B3A]/[0.025]">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className={`w-1.5 sm:w-2 h-10 rounded-full shrink-0 ${c.status === 'paid' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <div className="min-w-0">
                        <p className="font-semibold text-[#0B1B3A] truncate">{c.company_name || 'Project'}</p>
                        <p className="text-xs text-text-muted truncate">{PKG[c.package || ''] || c.package} · {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                      <span className="font-bold text-base sm:text-lg text-[#0B1B3A] tabular-nums">{fmt(c.commission_cents)}</span>
                      <span className={`px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold ${c.status === 'paid' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60'}`}>{c.status}</span>
                      {c.paid_at && <span className="text-xs text-emerald-600 hidden md:inline">Paid {new Date(c.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </Reveal>
    </div>
  );
}
