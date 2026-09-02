'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export function Panel({
  children,
  className = '',
  padding = 'md',
}: {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}) {
  const pad = padding === 'none' ? '' : padding === 'sm' ? 'p-4' : padding === 'lg' ? 'p-6' : 'p-5';
  return (
    <div className={`rounded-xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm ${pad} ${className}`}>
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="text-[13px] font-semibold text-zinc-100 tracking-tight">{title}</h3>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  trend,
  tone = 'neutral',
}: {
  label: string;
  value: number | string;
  trend?: number; // percent
  tone?: 'neutral' | 'emerald' | 'amber' | 'red' | 'cyan' | 'violet';
}) {
  const toneColors = {
    neutral: 'text-zinc-100',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    cyan: 'text-cyan-400',
    violet: 'text-violet-400',
  }[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3.5"
    >
      <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">{label}</div>
      <div className={`mt-1.5 text-2xl font-semibold tabular-nums tracking-tight ${toneColors}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {trend !== undefined && (
        <div className={`mt-1 text-[11px] tabular-nums ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend >= 0 ? '+' : ''}
          {trend.toFixed(1)}% vs yesterday
        </div>
      )}
    </motion.div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit';
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
  const sizes = {
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-sm px-3.5 py-2',
    lg: 'text-[15px] px-5 py-2.5',
  }[size];
  const variants = {
    primary: 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-950/40',
    ghost: 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30',
    outline: 'bg-transparent hover:bg-zinc-800/50 text-zinc-300 border border-zinc-700/60',
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes} ${variants} ${className}`}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  size = 'md',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'emerald' | 'amber' | 'red' | 'cyan' | 'violet' | 'rose' | 'blue';
  size?: 'sm' | 'md';
}) {
  const tones = {
    neutral: 'bg-zinc-800/70 text-zinc-300 border-zinc-700/60',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }[tone];
  const sz = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border font-medium ${sz} ${tones}`}>{children}</span>
  );
}

export function CapacityMeter({
  sent,
  cap,
  label,
  sublabel,
  paused,
  onTogglePause,
}: {
  sent: number;
  cap: number;
  label: string;
  sublabel?: string;
  paused?: boolean;
  onTogglePause?: () => void;
}) {
  const pct = cap > 0 ? Math.min(100, (sent / cap) * 100) : 0;
  const barColor =
    pct >= 100 ? 'bg-red-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-sm text-zinc-100 truncate font-medium">{label}</div>
          {sublabel && <div className="text-[11px] text-zinc-500 truncate">{sublabel}</div>}
        </div>
        {onTogglePause && (
          <button
            onClick={onTogglePause}
            className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
              paused
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50 hover:text-zinc-300'
            }`}
          >
            {paused ? 'Paused' : 'Active'}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full ${barColor}`}
          />
        </div>
        <div className="text-[11px] tabular-nums text-zinc-400 font-mono whitespace-nowrap">
          <span className="text-zinc-100 font-semibold">{sent}</span>
          <span className="text-zinc-600 mx-0.5">/</span>
          <span>{cap}</span>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="w-10 h-10 rounded-full bg-zinc-800/60 flex items-center justify-center text-zinc-500 mb-3">{icon}</div>}
      <div className="text-sm text-zinc-300 font-medium">{title}</div>
      {hint && <div className="text-xs text-zinc-500 mt-1 max-w-md">{hint}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 mb-8">
      <div>
        <h1 className="text-[22px] font-semibold text-zinc-100 tracking-tight">{title}</h1>
        {description && <p className="text-[13px] text-zinc-500 mt-1 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  );
}
