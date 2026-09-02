'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperGrainDefs } from '../_components/PaperGrainDefs';
import { PaperCard } from '../_components/PaperCard';
import { Colophon } from '../_components/Colophon';
import { SectionMasthead } from '../_components/SectionMasthead';
import { BrassButton } from '../_components/BrassButton';
import { Headline } from '../_components/Headline';
import { AnimatedNumber } from '../_components/AnimatedNumber';
import { AnimatedBar } from '../_components/AnimatedBar';
import { Stagger, StaggerItem } from '../_components/Reveal';
import { AnimatedModal } from '../_components/AnimatedModal';
import { SendProgress, type SendDoneSummary } from '../_components/SendProgress';
import { apiPath } from '@/lib/api-path';

interface Props {
  stats: {
    queued: number; sent: number; delivered: number;
    opened_raw: number; opened_real: number;
    clicked: number; replied: number; bounced: number; unsubscribed: number;
  };
  inboxes: Array<{
    id: string; label: string; email: string; sent_today: number; daily_cap: number; remaining: number; paused: boolean;
  }>;
  domains: Array<{ domain: string; sent_today: number; daily_cap: number; hard_ceiling: number; is_transactional: boolean }>;
  outreachPaused: boolean;
  signals: {
    open_rate_anomalies: Array<{ inbox_id: string; inbox_label: string; open_rate_today: number; open_rate_7d: number; delta_pct: number }>;
    silent_prospects: Array<{ prospect_id: string; prospect_name: string; prospect_email: string; hours_since_send: number }>;
    inbox_reputation_warnings: Array<{ inbox_id: string; inbox_label: string; bounce_rate_7d: number; complaint_rate_7d: number; recommended_action: string }>;
    any_alerts: boolean;
  };
  totals: { prospects_total: number; prospects_contacted: number; prospects_new: number; suppressions: number };
  recentSends: Array<{ id: string; name: string; email: string; subject: string; sent_at: string; opens_real: number; clicks: number; replied: boolean; bounced: boolean }>;
}

export default function DashboardView({
  stats, inboxes, domains, outreachPaused, signals, totals, recentSends,
}: Props) {
  const [paused, setPaused] = useState(outreachPaused);
  const [inboxState, setInboxState] = useState(inboxes);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startMessage, setStartMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    would_enqueue: number;
    first_scheduled_for: string | null;
    last_scheduled_for: string | null;
    skipped_suppressed: number;
    skipped_merge_tags: number;
    inboxes_used: Array<{ email: string; assigned: number }>;
    reason?: string;
  } | null>(null);

  const [liveStats, setLiveStats] = useState(stats);
  const [liveDomains, setLiveDomains] = useState(domains);
  const [liveSignals, setLiveSignals] = useState(signals);
  const [liveTotals, setLiveTotals] = useState(totals);
  const [liveRecentSends, setLiveRecentSends] = useState(recentSends);

  // Live polling: refresh the entire dashboard every 4s while the tab is
  // visible. No loading flicker — only updates change. Numbers tween, lists
  // re-stagger via AnimatePresence layoutIds.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        try {
          const r = await fetch(apiPath('/api/admin/outreach/dashboard'), { cache: 'no-store' });
          const d = await r.json();
          if (!alive) return;
          if (d.stats) setLiveStats(d.stats);
          if (d.inboxes) setInboxState(d.inboxes);
          if (d.domains) setLiveDomains(d.domains);
          if (typeof d.outreachPaused === 'boolean') setPaused(d.outreachPaused);
          if (d.signals) setLiveSignals(d.signals);
          if (d.totals) setLiveTotals(d.totals);
          if (d.recentSends) setLiveRecentSends(d.recentSends);
        } catch {}
      }
      if (alive) timer = setTimeout(tick, 4000);
    };
    timer = setTimeout(tick, 4000);
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, []);

  // Re-sync from server-rendered props on navigation/refresh. Without this,
  // optimistic updates from toggleInboxPause can drift from server truth.
  useEffect(() => { setInboxState(inboxes); }, [inboxes]);
  useEffect(() => { setPaused(outreachPaused); }, [outreachPaused]);

  async function togglePause() {
    setSaving(true);
    try {
      const r = await fetch(apiPath('/api/admin/outreach/settings'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_pause' }),
      });
      const d = await r.json();
      if (d.ok) setPaused(d.outreach_paused);
    } finally {
      setSaving(false);
    }
  }

  async function toggleInboxPause(id: string) {
    setSaving(true);
    try {
      const r = await fetch(apiPath('/api/admin/outreach/settings'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_inbox_pause', inbox_id: id }),
      });
      const d = await r.json();
      if (d.ok) {
        setInboxState((arr) => arr.map((i) => (i.id === id ? { ...i, paused: d.paused } : i)));
      }
    } finally {
      setSaving(false);
    }
  }

  async function previewSends() {
    setStarting(true);
    setStartMessage(null);
    try {
      const r = await fetch(apiPath('/api/outreach/send/start'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: true }),
      });
      const d = await r.json();
      if (r.ok) {
        setPreview({
          would_enqueue: d.would_enqueue ?? 0,
          first_scheduled_for: d.first_scheduled_for,
          last_scheduled_for: d.last_scheduled_for,
          skipped_suppressed: d.skipped_suppressed ?? 0,
          skipped_merge_tags: d.skipped_merge_tags ?? 0,
          inboxes_used: d.inboxes_used ?? [],
          reason: d.reason,
        });
      } else {
        setStartMessage(d.error || 'Failed to preview');
      }
    } catch (e) {
      setStartMessage(e instanceof Error ? e.message : 'Failed to preview');
    } finally {
      setStarting(false);
    }
  }

  // The actual send-queue build is streamed — see <SendProgress />. Here we
  // just flip into "running" mode; the modal swaps to a live progress view.
  function confirmStart() {
    setStarting(true);
    setStartMessage(null);
  }

  function onSendDone(summary: SendDoneSummary) {
    setStarting(false);
    setStartMessage(
      summary.enqueued > 0
        ? `${summary.enqueued} prospects queued. First send at ${
            summary.first_scheduled_for
              ? new Date(summary.first_scheduled_for).toLocaleTimeString()
              : '—'
          }, last at ${
            summary.last_scheduled_for
              ? new Date(summary.last_scheduled_for).toLocaleTimeString()
              : '—'
          }.`
        : summary.reason || 'Nothing to queue right now.',
    );
    setPreview(null);
  }

  function onSendError(reason: string) {
    setStarting(false);
    setStartMessage(reason || 'Failed to start');
    setPreview(null);
  }

  const anyPriorityAlert = liveSignals.any_alerts || liveDomains.some((d) => d.is_transactional && d.sent_today >= d.daily_cap * 0.8);
  const today = new Date();

  return (
    <div className="relative">
      <PaperGrainDefs />
      <PaperCard padding="lg" as="article" className="md:px-10 lg:px-14 lg:py-10">
        <SectionMasthead
          kicker="Today"
          title="Dashboard"
          description={`${liveTotals.prospects_contacted.toLocaleString()} prospects contacted · ${liveTotals.prospects_new.toLocaleString()} ready · ${liveTotals.suppressions.toLocaleString()} blocked.`}
          action={
            <div className="flex items-center gap-3">
              {paused ? (
                <button onClick={togglePause} disabled={saving} className="smallcaps text-[10px] crimson-text hover:ink-text underline-offset-4 hover:underline">
                  ✦ sending stopped — resume
                </button>
              ) : (
                <button onClick={togglePause} disabled={saving} className="smallcaps text-[10px] ink-soft hover:crimson-text underline-offset-4 hover:underline">
                  stop sending
                </button>
              )}
              <BrassButton size="md" onClick={previewSends} disabled={starting || paused}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M8 5v14l11-7L8 5z" /></svg>
                {starting ? 'Preparing…' : 'Send Now'}
              </BrassButton>
            </div>
          }
        />

        {startMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="brass-text font-display text-[14px] mt-5 px-1"
            style={{ fontStyle: 'italic' }}
          >
            ✦ {startMessage}
          </motion.div>
        )}

        {/* Priority alerts — Editor's Notice */}
        {anyPriorityAlert && (
          <section className="mt-7">
            <Headline scale="byline" className="crimson-text mb-3">Alert — Action Needed</Headline>
            <ul className="space-y-2">
              {liveDomains
                .filter((d) => d.is_transactional && d.sent_today >= d.daily_cap * 0.8)
                .map((d) => (
                  <li key={d.domain} className="flex items-center justify-between gap-3 py-2 pl-3" style={{ borderLeft: '3px solid var(--color-crimson)' }}>
                    <span className="font-display ink-text text-[13px]">
                      <span className="font-semibold" style={{ fontStyle: 'italic' }}>{d.domain}</span> at {d.sent_today}/{d.daily_cap} (ceiling {d.hard_ceiling}) — transactional domain near cap.
                    </span>
                    <span className="smallcaps text-[10px] crimson-text">domain</span>
                  </li>
                ))}
              {liveSignals.inbox_reputation_warnings.map((w) => (
                <li key={w.inbox_id} className="flex items-center justify-between gap-3 py-2 pl-3" style={{ borderLeft: '3px solid var(--color-crimson)' }}>
                  <span className="font-display ink-text text-[13px]">
                    <span className="font-semibold" style={{ fontStyle: 'italic' }}>{w.inbox_label}</span> reputation: bounce {(w.bounce_rate_7d * 100).toFixed(2)}% · complaint {(w.complaint_rate_7d * 100).toFixed(2)}%
                  </span>
                  <span className="smallcaps text-[10px] crimson-text">desk</span>
                </li>
              ))}
              {liveSignals.open_rate_anomalies.map((a) => (
                <li key={a.inbox_id} className="flex items-center justify-between gap-3 py-2 pl-3" style={{ borderLeft: '3px solid var(--color-brass)' }}>
                  <span className="font-display ink-text text-[13px]">
                    <span className="font-semibold" style={{ fontStyle: 'italic' }}>{a.inbox_label}</span> open rate dropped to {(a.open_rate_today * 100).toFixed(1)}% (was {(a.open_rate_7d * 100).toFixed(1)}%, Δ {a.delta_pct.toFixed(0)}%)
                  </span>
                  <span className="smallcaps text-[10px] brass-text">signal</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Today's tally — typeset numbers as a paragraph */}
        <section className="mt-7">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <Headline scale="byline">Today&apos;s Tally</Headline>
            <span className="smallcaps text-[10px] ink-soft tabular-nums">
              {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="brass-rule-thin mb-4" />
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3 font-display tabular-nums">
            <FrontStat label="Queued" value={liveStats.queued} />
            <span className="brass-text">·</span>
            <FrontStat label="Sent" value={liveStats.sent} />
            <span className="brass-text">·</span>
            <FrontStat label="Delivered" value={liveStats.delivered} accent="brass" />
            <span className="brass-text">·</span>
            <FrontStat label="Opens" value={liveStats.opened_real} accent="brass" />
            <span className="brass-text">·</span>
            <FrontStat label="Clicks" value={liveStats.clicked} accent="brass" />
            <span className="brass-text">·</span>
            <FrontStat label="Replies" value={liveStats.replied} accent="brass" />
            <span className="brass-text">·</span>
            <FrontStat label="Bounced" value={liveStats.bounced} accent={liveStats.bounced > 0 ? 'crimson' : undefined} />
            <span className="brass-text">·</span>
            <FrontStat label="Unsubs" value={liveStats.unsubscribed} accent={liveStats.unsubscribed > 0 ? 'crimson' : undefined} />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-7 mt-8">
          {/* Inbox capacity */}
          <section>
            <Headline scale="byline" className="mb-3">By Inbox</Headline>
            <div className="brass-rule-thin mb-3" />
            <div className="space-y-3">
              {inboxState.map((i) => {
                const pct = i.daily_cap > 0 ? Math.min(100, (i.sent_today / i.daily_cap) * 100) : 0;
                return (
                  <div key={i.id}>
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <span className="font-display ink-text text-[14px]" style={{ fontStyle: 'italic' }}>{i.email}</span>
                      <span className="font-display tabular-nums text-[13px] ink-text shrink-0">
                        <span className="font-semibold">{i.sent_today}</span>
                        <span className="ink-soft mx-0.5">/</span>
                        <span className="ink-soft">{i.daily_cap}</span>
                      </span>
                    </div>
                    <AnimatedBar pct={pct} />
                    <div className="flex items-center justify-between mt-1">
                      <span className="smallcaps text-[10px] ink-soft">{i.label}</span>
                      <button
                        onClick={() => toggleInboxPause(i.id)}
                        disabled={saving}
                        className={`smallcaps text-[10px] ${i.paused ? 'crimson-text' : 'ink-soft'} hover:ink-text underline-offset-4 hover:underline`}
                      >
                        {i.paused ? '✦ held — resume' : 'hold this desk'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Domain limits */}
          <section>
            <Headline scale="byline" className="mb-3">Standing Limits</Headline>
            <div className="brass-rule-thin mb-3" />
            <ul className="space-y-2.5">
              {liveDomains.map((d) => {
                const pct = d.hard_ceiling > 0 ? (d.sent_today / d.hard_ceiling) * 100 : 0;
                const overCap = pct >= 100;
                return (
                  <li key={d.domain}>
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="font-display ink-text text-[14px]" style={{ fontStyle: 'italic' }}>{d.domain}</span>
                        {d.is_transactional && <span className="smallcaps text-[10px] crimson-text">transactional</span>}
                      </div>
                      <div className="font-display tabular-nums text-[12px] ink-text shrink-0">
                        <span className="font-semibold">{d.sent_today}</span>
                        <span className="ink-soft mx-0.5">/</span>
                        <span className="ink-soft">{d.daily_cap}</span>
                        <span className="brass-text mx-1.5">·</span>
                        <span className="ink-soft">ceil {d.hard_ceiling}</span>
                      </div>
                    </div>
                    <AnimatedBar pct={pct} over={overCap} />
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Recent sends — On the Wire */}
        <section className="mt-8">
          <Headline scale="byline" className="mb-3">Recent Sends</Headline>
          <div className="brass-rule-thin mb-3" />
          {liveRecentSends.length === 0 ? (
            <div className="text-center py-8">
              <div className="brass-text text-[16px] mb-2">✦</div>
              <Headline scale="section" italic className="mb-1">No emails sent yet.</Headline>
              <p className="font-display ink-soft text-[12px]" style={{ fontStyle: 'italic' }}>
                Click <span className="ink-text not-italic">Send Now</span> to send today&apos;s batch.
              </p>
            </div>
          ) : (
            <Stagger className="space-y-2" delayChildren={0.15} staggerChildren={0.06}>
              {liveRecentSends.map((s) => (
                <StaggerItem
                  key={s.id}
                  as="div"
                  className="flex items-baseline justify-between gap-4 py-2 border-t group cursor-default"
                >
                  <motion.div
                    className="flex items-baseline justify-between gap-4 w-full px-1 -mx-1 rounded-sm"
                    whileHover={{ x: 3, backgroundColor: 'rgba(201,166,97,0.06)' }}
                    transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                    style={{ borderColor: 'rgba(11,27,58,0.06)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display ink-text text-[14px] font-semibold truncate">{s.name}</span>
                        <span className="font-display ink-soft text-[11px] truncate" style={{ fontStyle: 'italic' }}>{s.email}</span>
                      </div>
                      <div className="font-display ink-soft text-[12px] truncate mt-0.5" style={{ fontStyle: 'italic' }}>“{s.subject}”</div>
                    </div>
                    <div className="flex items-baseline gap-3 shrink-0 font-display tabular-nums text-[12px]">
                      {s.replied && <span className="smallcaps text-[10px] brass-text">replied</span>}
                      {s.bounced && <span className="smallcaps text-[10px] crimson-text">bounced</span>}
                      <span className={s.opens_real > 0 ? 'brass-text' : 'ink-soft'} title="Opens">{s.opens_real}o</span>
                      <span className={s.clicks > 0 ? 'brass-text' : 'ink-soft'} title="Clicks">{s.clicks}c</span>
                      <span className="ink-soft w-12 text-right" style={{ fontStyle: 'italic' }}>
                        {new Date(s.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </section>

        <Colophon />
      </PaperCard>

      {/* Preview / proof modal — premium pop-in via AnimatedModal */}
      <AnimatedModal
        open={!!preview}
        onClose={() => setPreview(null)}
        panelClassName="w-full max-w-lg rounded-sm"
        panelStyle={{
          backgroundColor: '#13100A',
          backgroundImage: 'radial-gradient(800px 500px at 50% 0%, rgba(180,145,74,0.10), transparent 60%)',
          border: '1px solid rgba(180,145,74,0.30)',
        }}
      >
        {preview && (
          <>
              <div className="px-7 pt-6 pb-3">
                <div className="brass-rule mb-4" />
                {starting ? (
                  <>
                    <Headline scale="byline" className="mb-1">Going to Press</Headline>
                    <Headline scale="section" italic>Setting today’s queue.</Headline>
                  </>
                ) : (
                  <>
                    <Headline scale="byline" className="mb-1">Confirm Send</Headline>
                    <Headline scale="section" italic>Review before sending.</Headline>
                    <p className="font-display ink-soft text-[13px] mt-2" style={{ fontStyle: 'italic' }}>
                      Look this over. Once you click confirm, the emails actually go out.
                    </p>
                  </>
                )}
              </div>
              <div className="px-7 py-4 space-y-5">
                {starting ? (
                  <SendProgress active={starting} onDone={onSendDone} onError={onSendError} />
                ) : preview.would_enqueue === 0 ? (
                  <p className="font-display ink-soft text-[14px]" style={{ fontStyle: 'italic' }}>
                    {preview.reason ?? 'Nothing to queue.'}
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="smallcaps text-[10px] ink-soft">Will send</div>
                        <div className="font-display ink-text mt-1 tabular-nums" style={{ fontWeight: 900, fontSize: '36px' }}>
                          {preview.would_enqueue}
                        </div>
                        <div className="font-display ink-soft text-[11px]" style={{ fontStyle: 'italic' }}>emails today</div>
                      </div>
                      <div>
                        <div className="smallcaps text-[10px] ink-soft">Window</div>
                        <div className="font-display ink-text text-[18px] mt-1 tabular-nums">
                          {preview.first_scheduled_for && preview.last_scheduled_for ? (
                            <>{new Date(preview.first_scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → {new Date(preview.last_scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                          ) : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="brass-rule-thin" />
                    <div>
                      <Headline scale="byline" className="mb-2">By inbox</Headline>
                      <div className="space-y-1.5">
                        {preview.inboxes_used.filter((i) => i.assigned > 0).map((i) => (
                          <div key={i.email} className="flex items-center justify-between font-display text-[14px]">
                            <span className="ink-text" style={{ fontStyle: 'italic' }}>{i.email}</span>
                            <span className="ink-text tabular-nums font-semibold">{i.assigned}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {(preview.skipped_suppressed > 0 || preview.skipped_merge_tags > 0) && (
                      <div className="font-display ink-soft text-[12px] space-y-0.5" style={{ fontStyle: 'italic' }}>
                        {preview.skipped_suppressed > 0 && <div>· {preview.skipped_suppressed} skipped (on block list)</div>}
                        {preview.skipped_merge_tags > 0 && <div>· {preview.skipped_merge_tags} skipped (unfilled merge tags)</div>}
                      </div>
                    )}
                  </>
                )}
              </div>
              {!starting && (
                <div className="px-7 pb-6 pt-3">
                  <div className="brass-rule-thin mb-4" />
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setPreview(null)}
                      className="smallcaps text-[11px] ink-soft hover:ink-text transition-colors px-2"
                    >
                      cancel
                    </button>
                    <BrassButton size="sm" onClick={confirmStart} disabled={preview.would_enqueue === 0}>
                      {preview.would_enqueue === 0 ? 'Nothing to send' : `Yes — send ${preview.would_enqueue}`}
                    </BrassButton>
                  </div>
                </div>
              )}
          </>
        )}
      </AnimatedModal>
    </div>
  );
}

function FrontStat({ label, value, accent }: { label: string; value: number; accent?: 'brass' | 'crimson' }) {
  const colorClass = accent === 'brass' ? 'brass-text' : accent === 'crimson' ? 'crimson-text' : 'ink-text';
  return (
    <motion.span
      className="inline-flex items-baseline gap-1.5"
      initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="smallcaps text-[10px] ink-soft">{label}</span>
      <AnimatedNumber
        value={value}
        className={`text-[24px] tabular-nums ${colorClass}`}
        style={{ fontWeight: 900 }}
        format={(n) => Math.round(n).toLocaleString()}
      />
    </motion.span>
  );
}
