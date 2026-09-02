'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperGrainDefs } from '../../_components/PaperGrainDefs';
import { PaperCard } from '../../_components/PaperCard';
import { Colophon } from '../../_components/Colophon';
import { SectionMasthead } from '../../_components/SectionMasthead';
import { BrassButton } from '../../_components/BrassButton';
import { Headline } from '../../_components/Headline';
import { apiPath } from '@/lib/api-path';

interface Suppression {
  id: string;
  email: string;
  reason: string;
  source: string | null;
  notes: string | null;
  unsubscribed_at: string;
}

const REASON_LABEL: Record<string, string> = {
  one_click_unsubscribe: 'one-click unsubscribe',
  manual_unsubscribe: 'unsubscribed by hand',
  hard_bounce: 'hard bounce',
  spam_complaint: 'spam complaint',
  reply_remove_request: 'asked to be removed',
  admin_suppressed: 'editor suppressed',
};

export default function SuppressionsView() {
  const [items, setItems] = useState<Suppression[]>([]);
  const [byReason, setByReason] = useState<Array<{ reason: string; n: number }>>([]);
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (reason) params.set('reason', reason);
      const res = await fetch(apiPath(`/api/admin/outreach/suppressions?${params}`));
      const data = await res.json();
      setItems(data.suppressions ?? []);
      setByReason(data.by_reason ?? []);
      setTotal(data.total ?? 0);
    } finally { setLoading(false); }
  }, [search, reason]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    const trimmed = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { alert('Enter a valid email'); return; }
    setAdding(true);
    try {
      await fetch(apiPath('/api/admin/outreach/suppressions'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      setNewEmail('');
      await load();
    } finally { setAdding(false); }
  }

  async function handleRemove(id: string, email: string) {
    if (!confirm(`Remove ${email}? They'll be eligible for outreach again.`)) return;
    await fetch(apiPath('/api/admin/outreach/suppressions'), {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="relative">
      <PaperGrainDefs />
      <PaperCard padding="lg" as="article" className="md:px-10 lg:px-14 lg:py-10">
        <SectionMasthead
          kicker="Block list"
          title="Suppressions"
          description="Email addresses on this list are never contacted again — across any campaign or inbox."
          action={
            <span className="smallcaps text-[11px] ink-soft tabular-nums">
              <span className="ink-text font-semibold">{total.toLocaleString()}</span> blocked
            </span>
          }
        />

        {/* Reason filter chips — typeset */}
        <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap mt-5 mb-4">
          <ReasonChip active={reason === ''} onClick={() => setReason('')}>All ({total})</ReasonChip>
          {byReason.map((r) => (
            <ReasonChip key={r.reason} active={reason === r.reason} onClick={() => setReason(r.reason)}>
              {REASON_LABEL[r.reason] ?? r.reason.replace(/_/g, ' ')} ({r.n})
            </ReasonChip>
          ))}
        </div>

        {/* Search + add */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text" placeholder="Search the register…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-b ink-text px-1 py-1.5 font-display italic text-[14px] placeholder:ink-soft focus:outline-none"
              style={{ borderColor: 'var(--color-ink)' }}
            />
          </div>
          <input
            type="email" placeholder="Add an address by hand…"
            value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="w-[260px] bg-transparent border-b ink-text px-1 py-1.5 font-display italic text-[14px] placeholder:ink-soft focus:outline-none"
            style={{ borderColor: 'var(--color-ink)' }}
          />
          <BrassButton size="sm" onClick={handleAdd} disabled={adding || !newEmail}>
            {adding ? 'Setting…' : 'Suppress'}
          </BrassButton>
        </div>

        {/* The register */}
        <div className="brass-rule-thin mb-2" />
        {loading && items.length === 0 ? (
          <p className="font-display ink-soft text-[14px] py-12 text-center" style={{ fontStyle: 'italic' }}>Loading list…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-10">
            <div className="brass-text text-[18px] mb-2">✦</div>
            <Headline scale="section" italic className="mb-1">No blocked addresses.</Headline>
            <p className="font-display ink-soft text-[12px]" style={{ fontStyle: 'italic' }}>
              Unsubscribes and bounces will be entered here as they arrive.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left smallcaps text-[10px] ink-soft px-1 py-2 font-medium">Address</th>
                <th className="text-left smallcaps text-[10px] ink-soft px-1 py-2 font-medium">Cause</th>
                <th className="text-left smallcaps text-[10px] ink-soft px-1 py-2 font-medium">Source</th>
                <th className="text-left smallcaps text-[10px] ink-soft px-1 py-2 font-medium">Notes</th>
                <th className="text-left smallcaps text-[10px] ink-soft px-1 py-2 font-medium">Entered</th>
                <th className="px-1 py-2"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {items.map((s) => {
                  const isCritical = s.reason === 'spam_complaint' || s.reason === 'hard_bounce';
                  return (
                    <motion.tr
                      key={s.id} layout
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-t"
                      style={{ borderColor: 'rgba(11,27,58,0.08)' }}
                    >
                      <td className="px-1 py-2.5 font-display ink-text text-[14px]" style={{ fontStyle: 'italic' }}>{s.email}</td>
                      <td className="px-1 py-2.5">
                        <span className={`smallcaps text-[10px] ${isCritical ? 'crimson-text' : 'brass-text'}`}>
                          {REASON_LABEL[s.reason] ?? s.reason.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-1 py-2.5 font-display ink-soft text-[12px]" style={{ fontStyle: 'italic' }}>{s.source ?? '—'}</td>
                      <td className="px-1 py-2.5 font-display ink-soft text-[12px] max-w-[260px] truncate" title={s.notes ?? ''}>{s.notes ?? '—'}</td>
                      <td className="px-1 py-2.5 font-display ink-soft text-[12px] tabular-nums" style={{ fontStyle: 'italic' }}>
                        {new Date(s.unsubscribed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-1 py-2.5 text-right">
                        <button onClick={() => handleRemove(s.id, s.email)} className="smallcaps text-[10px] ink-soft hover:crimson-text transition-colors">
                          strike
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}

        <Colophon />
      </PaperCard>
    </div>
  );
}

function ReasonChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="smallcaps text-[10px] tracking-[0.18em] transition-colors"
      style={{
        color: active ? 'var(--color-ink)' : 'var(--color-ink-soft)',
        borderBottom: active ? '2px solid var(--color-brass)' : '2px solid transparent',
        paddingBottom: '2px',
      }}
    >
      {children}
    </button>
  );
}
