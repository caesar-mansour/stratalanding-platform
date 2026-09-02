'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { ProjectStatus, PackageType } from '@/lib/types';
import {
  SpotlightCard,
  NumberTicker,
  MeterBar,
  Donut,
  AnimatedRing,
  RevealGroup,
  RevealItem,
  GradientText,
} from './_components/motion';
import { Avatar, StatusBadge } from './_components/admin-ui';

const packageLabels: Record<PackageType, string> = {
  starter: 'Presence Page',
  growth: 'Lead Page',
  scale: 'Purchase Page',
};

// Live clock for the command-center header. Null on first render to avoid an
// SSR/client hydration mismatch, then ticks every second.
function LiveClock({ dark = false }: { dark?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <div className="h-9" />;
  return (
    <div className="text-right tabular-nums">
      <div className={`text-2xl font-bold leading-none ${dark ? 'text-white' : 'text-text-primary'}`}>
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div
        className={`mt-1 text-[11px] font-medium uppercase tracking-wider ${dark ? 'text-cyan-200/60' : 'text-text-muted'}`}
      >
        {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>
    </div>
  );
}

interface ProjectWithClient {
  id: string;
  status: ProjectStatus;
  package: PackageType;
  timeline: string;
  created_at: string;
  clients: { id: string; email: string; name: string | null };
}

interface AdminDashboardStatsProps {
  projects: ProjectWithClient[];
}

const packagePricing: Record<PackageType, number> = { starter: 2400, growth: 4800, scale: 9600 };

export default function AdminDashboardStats({ projects }: AdminDashboardStatsProps) {
  const reduce = useReducedMotion();

  const stats = {
    total: projects.length,
    new: projects.filter((p) => p.status === 'new').length,
    proposalSent: projects.filter((p) => p.status === 'proposal_sent').length,
    depositPaid: projects.filter((p) => p.status === 'deposit_paid').length,
    inProduction: projects.filter((p) => p.status === 'in_production').length,
    readyForFinal: projects.filter((p) => p.status === 'ready_for_final_payment').length,
    paidInFull: projects.filter((p) => p.status === 'paid_in_full').length,
    launched: projects.filter((p) => p.status === 'launched').length,
    notInterested: projects.filter((p) => p.status === 'not_interested').length,
  };

  const paidProjects = projects.filter((p) =>
    ['deposit_paid', 'in_production', 'ready_for_final_payment', 'paid_in_full', 'launched'].includes(p.status)
  );
  const actualRevenue = paidProjects.reduce((sum, p) => {
    if (['paid_in_full', 'launched'].includes(p.status)) return sum + packagePricing[p.package];
    return sum + packagePricing[p.package] * 0.5;
  }, 0);

  const pipelineProjects = projects.filter((p) => ['new', 'proposal_sent'].includes(p.status));
  const pipelineValue = pipelineProjects.reduce((sum, p) => sum + packagePricing[p.package], 0);
  const activeCount = stats.depositPaid + stats.inProduction + stats.readyForFinal;

  const recent = [...projects]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const mainStats = [
    {
      label: 'Revenue Collected',
      value: actualRevenue,
      format: 'currency' as const,
      sub: `${paidProjects.length} paying ${paidProjects.length === 1 ? 'client' : 'clients'}`,
      iconBg: 'bg-emerald-500',
      beam: 'rgba(16,185,129,0.9)',
      glow: 'from-emerald-400/30',
      valueColor: 'text-emerald-600',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: 'Pipeline Value',
      value: pipelineValue,
      format: 'currency' as const,
      sub: `${pipelineProjects.length} open ${pipelineProjects.length === 1 ? 'lead' : 'leads'}`,
      iconBg: 'bg-[#0891B2]',
      beam: 'rgba(34,211,238,0.95)',
      glow: 'from-cyan-400/30',
      valueColor: 'text-[#0E7490]',
      icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    },
    {
      label: 'Active Projects',
      value: activeCount,
      format: 'number' as const,
      sub: 'in production now',
      iconBg: 'bg-amber-500',
      beam: 'rgba(245,158,11,0.9)',
      glow: 'from-amber-400/30',
      valueColor: 'text-amber-600',
      icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    },
    {
      label: 'Launched',
      value: stats.launched,
      format: 'number' as const,
      sub: 'sites live',
      iconBg: 'bg-violet-500',
      beam: 'rgba(139,92,246,0.9)',
      glow: 'from-violet-400/30',
      valueColor: 'text-violet-600',
      icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
    },
  ];

  const proposalsSent =
    stats.proposalSent + stats.depositPaid + stats.inProduction + stats.readyForFinal + stats.paidInFull + stats.launched;
  const depositsPaid = stats.depositPaid + stats.inProduction + stats.readyForFinal + stats.paidInFull + stats.launched;

  const funnel = [
    { label: 'Briefs Received', count: stats.total, percentage: 100 },
    { label: 'Proposals Sent', count: proposalsSent, percentage: stats.total > 0 ? Math.round((proposalsSent / stats.total) * 100) : 0 },
    { label: 'Deposits Paid', count: depositsPaid, percentage: stats.total > 0 ? Math.round((depositsPaid / stats.total) * 100) : 0 },
    { label: 'Projects Launched', count: stats.launched, percentage: stats.total > 0 ? Math.round((stats.launched / stats.total) * 100) : 0 },
  ];

  const statusChips = [
    { label: 'New', count: stats.new, color: 'bg-slate-100 text-slate-700', hex: '#94a3b8', pulse: stats.new > 0 },
    { label: 'Proposal', count: stats.proposalSent, color: 'bg-blue-100 text-blue-700', hex: '#3b82f6' },
    { label: 'Deposit', count: stats.depositPaid, color: 'bg-emerald-100 text-emerald-700', hex: '#10b981' },
    { label: 'Building', count: stats.inProduction, color: 'bg-amber-100 text-amber-700', hex: '#f59e0b' },
    { label: 'Ready', count: stats.readyForFinal, color: 'bg-orange-100 text-orange-700', hex: '#f97316' },
    { label: 'Paid', count: stats.paidInFull, color: 'bg-teal-100 text-teal-700', hex: '#14b8a6' },
    { label: 'Launched', count: stats.launched, color: 'bg-violet-100 text-violet-700', hex: '#8b5cf6' },
    { label: 'Lost', count: stats.notInterested, color: 'bg-rose-100 text-rose-700', hex: '#f43f5e' },
  ];

  const donutSegments = statusChips
    .filter((c) => c.count > 0)
    .map((c) => ({ value: c.count, color: c.hex, label: c.label }));

  const ratePct = (n: number) => (stats.total > 0 ? Math.round((n / stats.total) * 100) : 0);
  const rates = [
    { label: 'Deposit Conversion', value: ratePct(depositsPaid), color: '#0891B2' },
    { label: 'Paid in Full', value: ratePct(stats.paidInFull + stats.launched), color: '#10B981' },
    { label: 'Launched', value: ratePct(stats.launched), color: '#8B5CF6' },
  ];

  return (
    <div className="mb-8">
      {/* Command-center header — dark cockpit banner */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-6 overflow-hidden rounded-2xl border border-[#0891B2]/30 bg-gradient-to-br from-[#0B1B3A] via-[#0E2748] to-[#0A2536] p-6 shadow-[0_24px_70px_-24px_rgba(8,145,178,0.55)]"
      >
        {/* glow blobs — slowly drifting */}
        <motion.div
          className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full opacity-70 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.45), transparent 70%)' }}
          animate={reduce ? undefined : { x: [0, -30, 12, 0], y: [0, 18, -10, 0], scale: [1, 1.12, 0.94, 1] }}
          transition={reduce ? undefined : { duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        />
        <motion.div
          className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)' }}
          animate={reduce ? undefined : { x: [0, 26, -16, 0], y: [0, -16, 14, 0], scale: [1, 0.9, 1.1, 1] }}
          transition={reduce ? undefined : { duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        />
        {/* tech grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(34,211,238,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
          aria-hidden
        />
        {/* sheen sweep */}
        {!reduce && (
          <motion.div
            className="pointer-events-none absolute inset-y-0 w-1/3"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.14), transparent)' }}
            initial={{ x: '-130%' }}
            animate={{ x: '430%' }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', repeatDelay: 3 }}
            aria-hidden
          />
        )}

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/70">
              StrataLanding Control
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-[2.6rem] sm:leading-none">
              Command{' '}
              <span className="bg-gradient-to-r from-[#22D3EE] to-[#0891B2] bg-clip-text text-transparent">
                Center
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-sm font-bold text-white">LIVE</span>
              <span className="text-xs text-cyan-200/60">
                · <NumberTicker value={stats.total} /> tracked
              </span>
            </div>
            <div className="h-10 w-px bg-white/15" />
            <LiveClock dark />
          </div>
        </div>
      </motion.div>

      {/* KPI cards — spotlight glow follows the cursor */}
      <RevealGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" stagger={0.08}>
        {mainStats.map((stat, index) => (
          <RevealItem key={stat.label} className="h-full">
            <SpotlightCard padded className="h-full">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[3px] overflow-hidden"
                style={{ background: `linear-gradient(90deg, ${stat.beam}, transparent 80%)` }}
                aria-hidden
              >
                {!reduce && (
                  <motion.div
                    className="absolute top-0 h-full w-1/3"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)' }}
                    animate={{ x: ['-110%', '330%'] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.5, repeatDelay: 1.5 }}
                  />
                )}
              </div>
              <div
                className={`pointer-events-none absolute -top-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-br ${stat.glow} to-transparent blur-2xl opacity-55`}
                aria-hidden
              />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2.5">{stat.label}</p>
                  <p className={`text-[2.4rem] leading-none font-extrabold tracking-tight ${stat.valueColor}`}>
                    <NumberTicker value={stat.value} format={stat.format} />
                  </p>
                  <p className="mt-2 text-xs text-text-muted">{stat.sub}</p>
                </div>
                <motion.div
                  className="shrink-0"
                  animate={reduce ? undefined : { y: [0, -4, 0] }}
                  transition={reduce ? undefined : { duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.35 }}
                >
                  <motion.div
                    className={`${stat.iconBg} text-white p-2.5 rounded-xl shadow-md`}
                    whileHover={reduce ? undefined : { rotate: [0, -10, 10, -6, 0], scale: 1.12 }}
                    transition={{ duration: 0.5 }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                    </svg>
                  </motion.div>
                </motion.div>
              </div>
            </SpotlightCard>
          </RevealItem>
        ))}
      </RevealGroup>

      {/* Key conversion rates — animated rings */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
      >
        <h3 className="mb-5 text-base font-bold"><GradientText>Key Rates</GradientText></h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:divide-x sm:divide-white/60">
          {rates.map((r, i) => (
            <div key={r.label} className={`flex items-center gap-4 ${i > 0 ? 'sm:pl-6' : ''}`}>
              <AnimatedRing
                value={r.value}
                size={84}
                stroke={9}
                color={r.color}
                label={
                  <span className="text-base font-extrabold text-text-primary">
                    <NumberTicker value={r.value} format="percent" />
                  </span>
                }
              />
              <div>
                <p className="text-sm font-semibold text-text-primary">{r.label}</p>
                <p className="text-xs text-text-muted">of all briefs</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Status breakdown — donut + chips */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
      >
        <h3 className="text-base font-bold mb-4"><GradientText>Projects by Status</GradientText></h3>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {donutSegments.length > 0 && (
            <div className="shrink-0">
              <Donut
                segments={donutSegments}
                size={150}
                stroke={16}
                center={
                  <div className="text-center">
                    <p className="text-2xl font-bold text-text-primary">
                      <NumberTicker value={stats.total} />
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">total</p>
                  </div>
                }
              />
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 w-full">
            {statusChips.map((item, index) => (
              <motion.div
                key={item.label}
                initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.04, type: 'spring', stiffness: 320, damping: 22 }}
                whileHover={reduce ? undefined : { y: -3 }}
                className="rounded-xl border border-white/70 bg-white/55 p-3 text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: item.hex }} aria-hidden />
                  <p className="text-2xl font-bold text-text-primary">
                    <NumberTicker value={item.count} duration={0.9} />
                  </p>
                </div>
                <p className="text-xs font-medium text-text-muted mt-1">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Conversion funnel + Recent activity — 2-up */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2 items-start">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
      >
        <h3 className="text-base font-bold mb-4"><GradientText>Conversion Funnel</GradientText></h3>
        <div className="space-y-3.5">
          {funnel.map((item, index) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-text-muted">{item.label}</span>
                <span className="font-semibold text-text-primary tabular-nums">
                  {item.count} · <NumberTicker value={item.percentage} format="percent" />
                </span>
              </div>
              <MeterBar percentage={item.percentage} shimmer delay={0.3 + index * 0.1} height={12} />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent activity */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold"><GradientText>Recent Activity</GradientText></h3>
          <span className="text-xs font-medium text-text-muted">latest {recent.length}</span>
        </div>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">No projects yet — new leads will stream in here.</p>
        ) : (
          <RevealGroup className="space-y-1" stagger={0.05}>
            {recent.map((p) => (
              <RevealItem key={p.id}>
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/60">
                  <Avatar name={p.clients.name || p.clients.email} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {p.clients.name || p.clients.email}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {packageLabels[p.package]} ·{' '}
                      {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </motion.div>
      </div>
    </div>
  );
}
