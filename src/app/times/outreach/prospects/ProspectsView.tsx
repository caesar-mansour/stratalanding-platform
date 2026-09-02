'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperGrainDefs } from '../../_components/PaperGrainDefs';
import { PaperCard } from '../../_components/PaperCard';
import { Colophon } from '../../_components/Colophon';
import { SectionMasthead } from '../../_components/SectionMasthead';
import { Headline } from '../../_components/Headline';
import ProspectDrawer from './ProspectDrawer';
import { apiPath } from '@/lib/api-path';

interface ProspectRow {
  id: string;
  name: string;
  email: string | null;
  website: string | null;
  city: string | null;
  status: string;
  last_contact_at: string | null;
  draft_archetype: string | null;
  draft_subject: string | null;
  campaign_location: string | null;
  campaign_niche: string | null;
  sends_count: number;
  opens_real: number;
  clicks: number;
  replies: number;
}

const STATUS_LABEL: Record<string, string> = {
  new: 'new',
  queued: 'queued',
  sent: 'sent',
  opened: 'opened',
  clicked: 'clicked',
  replied: 'replied',
  unsubscribed: 'unsubscribed',
  bounced: 'bounced',
  suppressed: 'blocked',
  follow_up_due: 'follow-up due',
};

const STATUS_TONE: Record<string, 'ink' | 'brass' | 'crimson'> = {
  new: 'ink',
  queued: 'ink',
  sent: 'brass',
  opened: 'brass',
  clicked: 'brass',
  replied: 'brass',
  unsubscribed: 'crimson',
  bounced: 'crimson',
  suppressed: 'crimson',
  follow_up_due: 'brass',
};

const STATUSES = ['', 'new', 'queued', 'sent', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed', 'suppressed'];

export default function ProspectsView() {
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (search) params.set('q', search);
      params.set('page', String(page));
      const res = await fetch(apiPath(`/api/admin/outreach/prospects?${params}`));
      const data = await res.json();
      setProspects(data.prospects ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.total_pages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => { load(); }, [load]);

  // Live polling: silently refresh the list every 5s while tab is visible.
  // Updates land smoothly via the row layout/stagger animations.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        try {
          const params = new URLSearchParams();
          if (status) params.set('status', status);
          if (search) params.set('q', search);
          params.set('page', String(page));
          const res = await fetch(apiPath(`/api/admin/outreach/prospects?${params}`), { cache: 'no-store' });
          const data = await res.json();
          if (!alive) return;
          setProspects(data.prospects ?? []);
          setTotal(data.total ?? 0);
          setTotalPages(data.total_pages ?? 1);
        } catch {}
      }
      if (alive) timer = setTimeout(tick, 5000);
    };
    timer = setTimeout(tick, 5000);
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [status, search, page]);

  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div className="relative">
      <PaperGrainDefs />
      <PaperCard padding="lg" as="article" className="md:px-10 lg:px-14 lg:py-10">
        <SectionMasthead
          kicker="Directory"
          title="Prospects"
          description="Every business in your database. Click any name for full details."
          action={
            <span className="smallcaps text-[11px] ink-soft tabular-nums">
              <span className="ink-text font-semibold">{total.toLocaleString()}</span> total
            </span>
          }
        />

        {/* Search + status chips */}
        <div className="flex items-center gap-3 mt-5 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[280px]">
            <input
              type="text"
              placeholder="Search by name, address, or website…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-transparent border-b ink-text px-1 py-1.5 font-display italic text-[14px] placeholder:ink-soft focus:outline-none"
              style={{ borderColor: 'var(--color-ink)' }}
            />
          </div>
        </div>

        <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap mb-4">
          {STATUSES.map((s) => (
            <StatusChip
              key={s || 'all'}
              active={s === status}
              onClick={() => { setStatus(s); setPage(1); }}
            >
              {s === '' ? 'All' : STATUS_LABEL[s] ?? s}
            </StatusChip>
          ))}
        </div>

        <div className="brass-rule-thin mb-2" />

        {loading && prospects.length === 0 ? (
          <p className="font-display ink-soft text-[14px] py-12 text-center" style={{ fontStyle: 'italic' }}>
            Pulling files from the cabinet…
          </p>
        ) : prospects.length === 0 ? (
          <div className="text-center py-12">
            <div className="brass-text text-[18px] mb-2">✦</div>
            <Headline scale="section" italic className="mb-1">No file matches your search.</Headline>
            <p className="font-display ink-soft text-[12px]" style={{ fontStyle: 'italic' }}>Try clearing the filters.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left smallcaps text-[10px] ink-soft px-1 py-2 font-medium">Subject</th>
                <th className="text-left smallcaps text-[10px] ink-soft px-1 py-2 font-medium">Status</th>
                <th className="text-right smallcaps text-[10px] ink-soft px-1 py-2 font-medium">Letters</th>
                <th className="text-right smallcaps text-[10px] ink-soft px-1 py-2 font-medium">Opens</th>
                <th className="text-right smallcaps text-[10px] ink-soft px-1 py-2 font-medium">Clicks</th>
                <th className="text-right smallcaps text-[10px] ink-soft px-1 py-2 font-medium">Replies</th>
                <th className="text-left smallcaps text-[10px] ink-soft px-1 py-2 font-medium">Last contact</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {prospects.map((p, idx) => {
                  const isSelected = selectedId === p.id;
                  const tone = STATUS_TONE[p.status] ?? 'ink';
                  const toneClass = tone === 'brass' ? 'brass-text' : tone === 'crimson' ? 'crimson-text' : 'ink-text';
                  return (
                    <motion.tr
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        filter: 'blur(0px)',
                        transition: {
                          duration: 0.45,
                          delay: Math.min(idx, 14) * 0.025,
                          ease: [0.16, 1, 0.3, 1],
                        },
                      }}
                      exit={{ opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.2 } }}
                      whileHover={{
                        backgroundColor: isSelected
                          ? 'rgba(201,166,97,0.16)'
                          : 'rgba(201,166,97,0.06)',
                        x: 3,
                      }}
                      onClick={() => setSelectedId(p.id)}
                      className={`cursor-pointer border-t ${isSelected ? '' : ''}`}
                      style={{
                        borderColor: 'rgba(11,27,58,0.08)',
                        backgroundColor: isSelected ? 'rgba(180,145,74,0.10)' : 'transparent',
                      }}
                    >
                      <td className="px-1 py-3 max-w-[340px]">
                        <div className="truncate font-display ink-text text-[15px]" style={{ fontWeight: 600 }}>{p.name}</div>
                        <div className="truncate font-display ink-soft text-[12px]" style={{ fontStyle: 'italic' }}>
                          {p.email ?? <span className="ink-soft">(no address on file)</span>}
                          {p.campaign_niche && ` · ${p.campaign_niche}, ${p.campaign_location}`}
                        </div>
                      </td>
                      <td className="px-1 py-3">
                        <span className={`smallcaps text-[10px] ${toneClass}`}>
                          {STATUS_LABEL[p.status] ?? p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-1 py-3 text-right font-display ink-text tabular-nums text-[14px]">{p.sends_count}</td>
                      <td className="px-1 py-3 text-right font-display tabular-nums text-[14px]">
                        <span className={p.opens_real > 0 ? 'brass-text' : 'ink-soft'}>{p.opens_real}</span>
                      </td>
                      <td className="px-1 py-3 text-right font-display tabular-nums text-[14px]">
                        <span className={p.clicks > 0 ? 'brass-text' : 'ink-soft'}>{p.clicks}</span>
                      </td>
                      <td className="px-1 py-3 text-right font-display tabular-nums text-[14px]">
                        <span className={p.replies > 0 ? 'brass-text font-semibold' : 'ink-soft'}>{p.replies}</span>
                      </td>
                      <td className="px-1 py-3 font-display ink-soft tabular-nums text-[12px]" style={{ fontStyle: 'italic' }}>
                        {p.last_contact_at ? new Date(p.last_contact_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="brass-rule-thin mt-4 mb-3" />
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="smallcaps ink-soft tabular-nums">
              Page <span className="ink-text">{page}</span> of <span className="ink-text">{totalPages}</span>
            </span>
            <div className="flex gap-4">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="smallcaps text-[10px] ink-text hover:brass-text disabled:opacity-30 underline-offset-4 hover:underline">← previous</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="smallcaps text-[10px] ink-text hover:brass-text disabled:opacity-30 underline-offset-4 hover:underline">next →</button>
            </div>
          </div>
        )}

        <Colophon />
      </PaperCard>

      <ProspectDrawer
        prospectId={selectedId}
        onClose={() => setSelectedId(null)}
        onMutate={load}
      />
    </div>
  );
}

function StatusChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      className="smallcaps text-[10px] tracking-[0.18em] transition-colors relative"
      style={{
        color: active ? 'var(--color-ink)' : 'var(--color-ink-soft)',
        paddingBottom: '4px',
      }}
    >
      <span className="relative">{children}</span>
      {active && (
        <motion.span
          layoutId="prospectStatusChip"
          className="absolute left-0 right-0 bottom-0 h-[2px]"
          style={{
            background:
              'linear-gradient(90deg, transparent, var(--color-brass), transparent)',
            boxShadow: '0 0 8px rgba(201,166,97,0.6)',
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
    </motion.button>
  );
}
