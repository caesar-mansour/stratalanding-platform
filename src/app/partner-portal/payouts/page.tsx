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

const PKG: Record<string, string> = { starter: 'Presence', growth: 'Lead', scale: 'Purchase' };
function fmt(c: number) { return `$${(c / 100).toLocaleString()}`; }

const GLASS = "rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]";

export default function PayoutsPage() {
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/partner-portal').then(r => r.json()).then(d => {
      setConversions(d.conversions || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const paid = conversions.filter(c => c.status === 'paid');
  const pending = conversions.filter(c => c.status === 'pending');
  const totalPaid = paid.reduce((s, c) => s + c.commission_cents, 0);
  const totalPending = pending.reduce((s, c) => s + c.commission_cents, 0);

  return (
    <div className="space-y-6">
        {/* Page header */}
        <Reveal>
          <div>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight">
              <GradientText from="#0B1B3A" to="#0891B2">Payouts</GradientText>
            </h1>
            <p className="text-sm text-text-muted mt-1">Track your commission payments.</p>
          </div>
        </Reveal>

        {/* Summary Cards */}
        <RevealGroup className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Paid', value: totalPaid, color: 'text-emerald-600', icon: '✅' },
            { label: 'Pending', value: totalPending, color: 'text-amber-600', icon: '⏳' },
            { label: 'Total Earned', value: totalPaid + totalPending, color: 'text-[var(--color-accent)]', icon: '💎' },
          ].map(s => (
            <RevealItem key={s.label}>
              <div className={GLASS + ' p-6'}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">{s.label}</span>
                  <span className="text-lg">{s.icon}</span>
                </div>
                <div className={`text-3xl font-bold ${s.color}`}>
                  <NumberTicker value={s.value / 100} format="currency" decimals={0} />
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>

        {/* Paid Payouts */}
        <Reveal delay={0.08}>
          <div className={GLASS + " overflow-hidden"}>
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Payout History</h3>
            </div>

            {loading ? (
              <div className="p-12 text-center text-text-muted text-sm">Loading...</div>
            ) : paid.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/60 bg-white/70 text-emerald-600 shadow-[0_6px_20px_-10px_rgba(11,27,58,0.25)] backdrop-blur-md mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold">
                  <GradientText from="#0B1B3A" to="#0891B2">No payouts yet</GradientText>
                </h3>
                <p className="text-sm text-text-muted mt-1">Commissions are paid via PayPal within 5 business days after client pays in full.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {paid.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 transition-colors hover:bg-[#0B1B3A]/[0.025]">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 ring-1 ring-emerald-200/60 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[#0B1B3A] truncate">{c.company_name || 'Project'} — {PKG[c.package || ''] || c.package}</p>
                        <p className="text-xs text-text-muted truncate">Paid {c.paid_at ? new Date(c.paid_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</p>
                      </div>
                    </div>
                    <span className="font-bold text-base sm:text-lg text-emerald-600 shrink-0 tabular-nums">{fmt(c.commission_cents)}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* Pending */}
        {pending.length > 0 && (
          <Reveal delay={0.12}>
            <div className="rounded-2xl border border-amber-200/50 bg-amber-50/60 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)] overflow-hidden">
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-amber-200/40">
                <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider">Pending Payouts</h3>
              </div>
              <div className="divide-y divide-amber-200/40">
                {pending.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 transition-colors hover:bg-amber-100/30">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-[#0B1B3A] truncate">{c.company_name || 'Project'} — {PKG[c.package || ''] || c.package}</p>
                      <p className="text-xs text-text-muted">Earned {new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className="font-bold text-base sm:text-lg text-amber-700 tabular-nums">{fmt(c.commission_cents)}</span>
                      <span className="px-2 sm:px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200/60 text-[10px] sm:text-[11px] font-bold">Pending</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}
    </div>
  );
}
