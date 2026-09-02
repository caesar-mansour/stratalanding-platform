'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { trackPartnerLinkCopy } from '@/lib/analytics';
import {
  GradientText,
  Reveal,
  RevealGroup,
  RevealItem,
  NumberTicker,
  PortalCard,
  CopyButton,
} from '@/app/portal/components/portal-ui';

interface AffiliateData {
  name: string;
  referralCode: string;
  status: string;
  totalClicks: number;
  totalConversions: number;
  totalEarnedCents: number;
  totalPaidCents: number;
  commissionRate: number;
}

interface Conversion {
  id: string;
  commission_cents: number;
  status: string;
  created_at: string;
  company_name: string | null;
  package: string | null;
}

interface ClickDay {
  day: string;
  count: number;
}

const PKG: Record<string, string> = { starter: 'Presence', growth: 'Lead', scale: 'Purchase' };
function fmt(c: number) { return `$${(c / 100).toLocaleString()}`; }

function useAffiliate(): AffiliateData | null {
  const [d, setD] = useState<AffiliateData | null>(null);
  useEffect(() => {
    const el = document.getElementById('affiliate-data');
    if (el) setD(JSON.parse(el.textContent || '{}'));
  }, []);
  return d;
}

// GLASS card recipe — shared across the client portal.
const card =
  'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]';

// ─── Mini Bar Chart (CSS-only) ──────────────────────────────────────────────

function BarChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      <div className="flex items-end gap-1 h-32">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.03, ease: [0, 0, 0.2, 1] }}
              className="w-full rounded-t-md min-h-[2px]"
              style={{ background: d.value > 0 ? 'linear-gradient(to top, rgba(8,145,178,0.6), rgba(34,211,238,0.8))' : 'rgba(11,27,58,0.05)' }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-text-muted">{data[0]?.label}</span>
        <span className="text-[10px] text-text-muted font-medium">{label}</span>
        <span className="text-[10px] text-text-muted">{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

// ─── Donut Chart (SVG) ──────────────────────────────────────────────────────

function DonutChart({ paid, pending, total }: { paid: number; pending: number; total: number }) {
  const paidPct = total > 0 ? (paid / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
  const r = 40;
  const c = 2 * Math.PI * r;
  const paidDash = (paidPct / 100) * c;
  const pendingDash = (pendingPct / 100) * c;

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {/* Track */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(11,27,58,0.05)" strokeWidth="10" />
        {/* Paid */}
        <motion.circle
          cx="50" cy="50" r={r} fill="none" stroke="#10B981" strokeWidth="10" strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${paidDash} ${c - paidDash}` }}
          transition={{ duration: 1, ease: [0, 0, 0.2, 1] }}
        />
        {/* Pending */}
        <motion.circle
          cx="50" cy="50" r={r} fill="none" stroke="#F59E0B" strokeWidth="10" strokeLinecap="round"
          strokeDashoffset={-paidDash}
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${pendingDash} ${c - pendingDash}` }}
          transition={{ duration: 1, delay: 0.2, ease: [0, 0, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-text-primary">
          <NumberTicker value={total / 100} format="currency" />
        </span>
        <span className="text-[10px] text-text-muted">Total</span>
      </div>
    </div>
  );
}

// ─── Sparkline (SVG) ─────────────────────────────────────────────────────────

function Sparkline({ values, color = '#0891B2' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 120;
  const h = 32;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * (h - 4)}`).join(' ');
  const area = `0,${h} ${points} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <polygon points={area} fill={`${color}15`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PartnerDashboard() {
  const a = useAffiliate();
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [clicksByDay, setClicksByDay] = useState<ClickDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/partner-portal').then(r => r.json()).then(d => {
      setConversions(d.conversions || []);
      setClicksByDay(d.clicksByDay || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Build 14-day click chart
  const clickChart = useMemo(() => {
    const days: { label: string; value: number }[] = [];
    const clickMap = new Map(clicksByDay.map(c => [c.day.slice(0, 10), c.count]));
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push({ label, value: clickMap.get(key) || 0 });
    }
    return days;
  }, [clicksByDay]);

  // Sparkline values for stats
  const clickSparkline = clickChart.map(d => d.value);
  const totalClicksLast14 = clickChart.reduce((s, d) => s + d.value, 0);

  if (!a) return null;

  const pending = a.totalEarnedCents - a.totalPaidCents;
  const link = `https://stratalanding.com?ref=${a.referralCode}`;
  const convRate = a.totalClicks > 0 ? ((a.totalConversions / a.totalClicks) * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-text-muted">
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        <span className="text-sm">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ═══ WELCOME ═══ */}
      <Reveal className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">
            <GradientText from="#0B1B3A" to="#0891B2">Welcome back, {a.name.split(' ')[0]}</GradientText>
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Here&apos;s how your referrals are performing</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${a.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {a.status}
          </span>
        </div>
      </Reveal>

      {/* ═══ REFERRAL LINK ═══ */}
      <Reveal delay={0.03}>
        <PortalCard className={card + ' p-4 flex items-center gap-4'}>
          <div className="w-10 h-10 rounded-xl border border-white/60 bg-gradient-to-br from-white/80 to-[#22D3EE]/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-0.5">Your referral link</div>
            <code className="text-sm font-mono text-accent truncate block">{link}</code>
          </div>
          {/* Wrapper fires the link-copy analytics; visual control is the shared CopyButton. */}
          <span
            onClickCapture={() => trackPartnerLinkCopy()}
            className="flex-shrink-0"
          >
            <CopyButton
              value={link}
              label="Copy Link"
              className="px-5 py-2.5 rounded-xl font-semibold border border-accent/20 bg-accent/10 text-accent hover:bg-accent/15 hover:text-accent"
            />
          </span>
        </PortalCard>
      </Reveal>

      {/* ═══ STATS ROW ═══ */}
      <RevealGroup className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Clicks', value: a.totalClicks, format: 'number' as const, sub: <><NumberTicker value={totalClicksLast14} format="number" /> last 14d</>, spark: clickSparkline, color: '#0891B2' },
          { label: 'Conversions', value: a.totalConversions, format: 'number' as const, sub: `${convRate}% rate`, spark: null, color: '#0891B2' },
          { label: 'Earned', value: a.totalEarnedCents / 100, format: 'currency' as const, sub: <>{fmt(a.totalPaidCents)} paid</>, spark: null, color: '#10B981' },
          { label: 'Pending', value: pending / 100, format: 'currency' as const, sub: pending > 0 ? 'Awaiting payout' : 'All paid', spark: null, color: '#F59E0B' },
        ].map((s) => (
          <RevealItem key={s.label}>
            <PortalCard className={card + ' p-5 flex flex-col justify-between h-full'}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-text-muted uppercase tracking-wider font-bold">{s.label}</span>
                <div className="w-2 h-2 rounded-full" style={{ background: s.color, opacity: 0.4 }} />
              </div>
              <div className="text-2xl font-bold text-text-primary mb-1">
                <NumberTicker value={s.value} format={s.format} />
              </div>
              {s.spark && <Sparkline values={s.spark} color={s.color} />}
              <span className="text-[10px] text-text-muted mt-1">{s.sub}</span>
            </PortalCard>
          </RevealItem>
        ))}
      </RevealGroup>

      {/* ═══ CHARTS ROW ═══ */}
      <RevealGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Click Activity — 14 day bar chart */}
        <RevealItem className="lg:col-span-2">
          <PortalCard className={card + ' p-6 h-full'}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Click Activity</h3>
                <p className="text-[11px] text-text-muted">Last 14 days</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-accent">
                  <NumberTicker value={totalClicksLast14} format="number" />
                </div>
                <div className="text-[10px] text-text-muted">total clicks</div>
              </div>
            </div>
            <BarChart data={clickChart} label="14-day activity" />
          </PortalCard>
        </RevealItem>

        {/* Earnings Donut */}
        <RevealItem>
          <PortalCard className={card + ' p-6 h-full'}>
            <h3 className="text-sm font-bold text-text-primary mb-1">Earnings</h3>
            <p className="text-[11px] text-text-muted mb-5">Paid vs pending</p>
            <DonutChart paid={a.totalPaidCents} pending={pending} total={a.totalEarnedCents} />
            <div className="flex justify-center gap-6 mt-5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-text-muted">Paid</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs text-text-muted">Pending</span>
              </div>
            </div>
          </PortalCard>
        </RevealItem>
      </RevealGroup>

      {/* ═══ COMMISSIONS + RECENT ═══ */}
      <RevealGroup className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Commission Rates — Compact */}
        <RevealItem className="lg:col-span-2">
          <PortalCard className={card + ' p-6 h-full'}>
            <h3 className="text-sm font-bold text-text-primary mb-4">Commission Rates</h3>
            <div className="space-y-3">
              {[
                { pkg: 'Presence', price: 2400, cut: 480 },
                { pkg: 'Lead', price: 4800, cut: 960 },
                { pkg: 'Purchase', price: 9600, cut: 1920 },
              ].map(c => (
                <div key={c.pkg} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg border border-white/60 bg-gradient-to-br from-white/80 to-[#22D3EE]/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-accent">{c.pkg[0]}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">{c.pkg} Page</div>
                      <div className="text-[10px] text-text-muted">${c.price.toLocaleString()} project</div>
                    </div>
                  </div>
                  <div className="text-base font-bold text-accent">
                    <NumberTicker value={c.cut} format="currency" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-text-muted">Your rate</span>
              <span className="text-sm font-bold text-text-primary">{a.commissionRate}% flat</span>
            </div>
          </PortalCard>
        </RevealItem>

        {/* Recent Conversions */}
        <RevealItem className="lg:col-span-3">
          <PortalCard className={card + ' p-6 h-full'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-text-primary">Recent Conversions</h3>
              {conversions.length > 0 && <a href="/partner-portal/conversions" className="text-[11px] text-accent hover:underline font-semibold">View all →</a>}
            </div>

            {conversions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl border border-white/60 bg-gradient-to-br from-white/80 to-[#22D3EE]/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">💸</span>
                </div>
                <p className="text-sm font-medium text-text-primary mb-0.5">No conversions yet</p>
                <p className="text-xs text-text-muted">Share your link to start earning</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversions.slice(0, 5).map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.04 }}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-white/60 transition-colors">
                    <div className={`w-1 h-8 rounded-full ${c.status === 'paid' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{c.company_name || 'Project'}</p>
                      <p className="text-[10px] text-text-muted">{PKG[c.package || ''] || c.package} · {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </div>
                    <span className="text-sm font-bold text-text-primary">{fmt(c.commission_cents)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{c.status}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </PortalCard>
        </RevealItem>
      </RevealGroup>

      {/* ═══ QUICK SHARE ═══ */}
      <Reveal delay={0.05}>
        <PortalCard className={card + ' p-6'}>
          <h3 className="text-sm font-bold text-text-primary mb-1">Quick Share</h3>
          <p className="text-[11px] text-text-muted mb-4">Click to copy a ready-made referral message</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              `Need a landing page? I recommend StrataLanding — they build high-performance pages starting at $2,400. Fixed price, no calls needed: ${link}`,
              `If your clients need conversion-focused landing pages, check out StrataLanding. I refer all my overflow work there: ${link}`,
            ].map((msg, i) => (
              <div key={i} className="rounded-xl border border-white/60 bg-white/50 hover:bg-white/70 p-4 text-xs text-text-muted leading-relaxed cursor-pointer transition-colors group relative"
                onClick={() => { navigator.clipboard.writeText(msg); }}>
                <p className="pr-6">{msg}</p>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </PortalCard>
      </Reveal>
    </div>
  );
}
