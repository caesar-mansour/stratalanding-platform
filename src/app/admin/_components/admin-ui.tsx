'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';
import Link from 'next/link';
import { SpotlightCard, Pulse } from './motion';

/* ─────────────────────────── Card ─────────────────────────── */

export function AdminCard({
  children,
  className = '',
  padded = false,
  spotlight = false,
  tilt = false,
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  /** Opt-in cursor-following glow (delegates to the motion SpotlightCard). */
  spotlight?: boolean;
  /** When spotlight: also tilt toward the cursor. */
  tilt?: boolean;
  /** When spotlight: lift on hover (default true). */
  hover?: boolean;
}) {
  // Opt-in premium surface. Mirrors the default card's shape/padding so the
  // SpotlightCard's own bg-surface/rounded-2xl/border/shadow line up exactly.
  if (spotlight) {
    return (
      <SpotlightCard
        tilt={tilt}
        hover={hover}
        padded={padded}
        className={`overflow-hidden ${className}`}
      >
        {children}
      </SpotlightCard>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)] overflow-hidden ${
        padded ? 'p-6' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ───────────────────────── Empty state ─────────────────────── */

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-dashed border-white/60 bg-white/55 backdrop-blur-md p-12 text-center shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
    >
      <Pulse className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-text-muted ring-1 ring-white/60">
        {icon ?? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        )}
      </Pulse>
      <p className="text-text-primary font-medium">{title}</p>
      {description && <p className="text-sm text-text-muted mt-1">{description}</p>}
    </motion.div>
  );
}

/* ─────────────────────────── Avatar ────────────────────────── */

const AVATAR_GRADIENTS = [
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-fuchsia-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-blue-700',
];

export function Avatar({ name, size = 36 }: { name?: string | null; size?: number }) {
  const label = (name || '?').trim();
  const initials =
    label
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?';
  // Deterministic gradient from the name so each entity keeps a stable color.
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  const gradient = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white font-semibold`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}

/* ───────────────────────── Status badge ────────────────────── */

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-slate-100 text-slate-700',
  proposal_sent: 'bg-blue-100 text-blue-700',
  deposit_paid: 'bg-emerald-100 text-emerald-700',
  in_production: 'bg-amber-100 text-amber-700',
  ready_for_final_payment: 'bg-orange-100 text-orange-700',
  paid_in_full: 'bg-teal-100 text-teal-700',
  launched: 'bg-violet-100 text-violet-700',
  not_interested: 'bg-rose-100 text-rose-700',
};

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-sm text-text-muted">—</span>;
  const style = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700';
  const label = status.replace(/_/g, ' ');
  // "Live" statuses get a pulsing dot so the eye catches active work.
  const live = status === 'in_production' || status === 'new';
  const dot = <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current" />;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${style}`}>
      {live ? <Pulse>{dot}</Pulse> : dot}
      {label}
    </span>
  );
}

/* ─────────────────────────── DataTable ─────────────────────── */

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  /** Tailwind classes for the cell (td). */
  cellClassName?: string;
  render: (row: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  /** Optional header bar above the table. */
  title?: ReactNode;
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

export function DataTable<T>({ columns, rows, rowKey, title }: DataTableProps<T>) {
  const reduce = useReducedMotion();

  return (
    <AdminCard>
      {title && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          {typeof title === 'string' ? (
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          ) : (
            title
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider ${
                    alignClass[col.align ?? 'left']
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, i) => (
              <motion.tr
                key={rowKey(row, i)}
                initial={reduce || i > 14 ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ backgroundColor: 'rgba(8, 145, 178, 0.05)' }}
                className="group"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-6 py-4 align-middle ${alignClass[col.align ?? 'left']} ${col.cellClassName ?? ''}`}
                  >
                    {col.render(row, i)}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminCard>
  );
}
