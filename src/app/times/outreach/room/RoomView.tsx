'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button, EmptyState } from '../../_components/ui';
import { PaperGrainDefs } from '../../_components/PaperGrainDefs';
import { Masthead } from '../../_components/Masthead';
import { BrassButton } from '../../_components/BrassButton';
import { Headline, spellNumber } from '../../_components/Headline';
import { Colophon } from '../../_components/Colophon';
import { AnimatedModal } from '../../_components/AnimatedModal';
import { SendProgress, type SendDoneSummary } from '../../_components/SendProgress';
import type { RoomPayload } from '@/lib/outreach/room-data';
import { apiPath } from '@/lib/api-path';

interface HotReply {
  event_id: string;
  send_id: string;
  created_at: string;
  reply_body: string | null;
  reply_classification: string;
  reply_match_confidence: string | null;
  prospect_id: string;
  prospect_name: string;
  prospect_email: string;
  original_subject: string;
  classifier_rationale: string | null;
  classifier_confidence: number | null;
}

interface FuzzyMatch {
  event_id: string;
  created_at: string;
  prospect_name: string;
  prospect_email: string;
  reply_body: string | null;
  reply_classification: string | null;
}

interface Warning {
  id: string;
  type: string;
  severity: 'critical' | 'warning';
  title: string;
  body: string;
  action_label?: string;
  action_href?: string;
}

interface RunState {
  total: number;
  sent: number;
  pending: number;
  sending: number;
  failed: number;
  first_scheduled: string | null;
  last_scheduled: string | null;
  next_pending: string | null;
  in_progress: boolean;
  done: boolean;
  per_inbox: Array<{ inbox_id: string; label: string; email: string; total: number; sent: number; pending: number }>;
}

interface InboxCapacity {
  id: string;
  label: string;
  email: string;
  sent_today: number;
  daily_cap: number;
  remaining: number;
  paused: boolean;
  active: boolean;
  start_hour: number | null;
  end_hour: number | null;
  min_spacing_seconds: number;
  max_spacing_seconds: number;
}

interface Room {
  decision_count: number;
  hot_replies: HotReply[];
  warm_replies: HotReply[];
  fuzzy_matches: FuzzyMatch[];
  warnings: Warning[];
  today: {
    stats: { sent: number; opened_real: number; clicked: number; replied: number; bounced: number };
    inbox_capacity: InboxCapacity[];
    total_remaining_capacity: number;
    ready_to_send: number;
    outreach_paused: boolean;
    can_start: boolean;
    run: RunState;
  };
  schedule: {
    daily_run_enabled: boolean;
    daily_run_hour: number;
    daily_run_last_at: string | null;
  };
}

export default function RoomView({ initialData }: { initialData: RoomPayload }) {
  const router = useRouter();
  const [data, setData] = useState<Room>(initialData as Room);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedReply, setExpandedReply] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [preview, setPreview] = useState<{
    would_enqueue: number;
    first_scheduled_for: string | null;
    last_scheduled_for: string | null;
    inboxes_used: Array<{ email: string; assigned: number }>;
    reason?: string;
  } | null>(null);
  const [startMessage, setStartMessage] = useState<string | null>(null);

  // Silent refetch — no loading flicker. Used by both manual refresh and the
  // live polling loop. Skips state update if the tab is hidden.
  const inflight = useRef(false);
  const refetch = useCallback(async (showLoading = false) => {
    if (inflight.current) return;
    inflight.current = true;
    if (showLoading) setLoading(true);
    try {
      const r = await fetch(apiPath('/api/admin/outreach/room'), { cache: 'no-store' });
      const d = await r.json();
      if (!d.error) setData(d);
    } finally {
      inflight.current = false;
      if (showLoading) setLoading(false);
    }
  }, []);

  // Live polling: refetch every 4s while the tab is visible so the page
  // stays current without a manual refresh. When a run is actively sending,
  // poll faster (every 2s) so progress feels real-time.
  useEffect(() => {
    const interval = data.today.run.in_progress ? 2000 : 4000;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        await refetch(false);
      }
      timer = setTimeout(tick, interval);
    };
    timer = setTimeout(tick, interval);
    return () => { if (timer) clearTimeout(timer); };
  }, [data.today.run.in_progress, refetch]);

  // Backwards-compat alias for existing callers below
  const load = useCallback(() => refetch(true), [refetch]);

  async function handleReply(event_id: string) {
    setSaving(true);
    try {
      await fetch(apiPath('/api/admin/outreach/room/handle'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_ids: [event_id] }),
      });
      await load();
    } finally { setSaving(false); }
  }

  async function previewSends() {
    setStarting(true);
    try {
      const r = await fetch(apiPath('/api/outreach/send/start'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: true }),
      });
      const d = await r.json();
      setPreview({
        would_enqueue: d.would_enqueue ?? 0,
        first_scheduled_for: d.first_scheduled_for,
        last_scheduled_for: d.last_scheduled_for,
        inboxes_used: d.inboxes_used ?? [],
        reason: d.reason,
      });
    } finally { setStarting(false); }
  }

  // The actual send-queue build is streamed via <SendProgress />. This just
  // flips the modal into "running" mode; the stream wires its own progress UI.
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
          }.`
        : summary.reason || 'Nothing to queue.',
    );
    setPreview(null);
    void load();
  }

  function onSendError(reason: string) {
    setStarting(false);
    setStartMessage(reason || 'Failed to start');
    setPreview(null);
  }

  const timeOfDay = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const editorialDeck = data.decision_count === 0
    ? <em>You are clear. No fires today, no fuzzy matches, no critical warnings.</em>
    : <em>{data.decision_count} {data.decision_count === 1 ? 'decision' : 'decisions'} pending. Handle in order.</em>;

  return (
    <div className="relative">
      <PaperGrainDefs />

      {/* Hot replies banner */}
      <AnimatePresence>
        {data.hot_replies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="mb-3 px-4 py-2 flex items-center gap-3 rounded-sm"
            style={{
              backgroundColor: 'var(--color-crimson)',
              color: '#FBF7EE',
              borderTop: '2px solid #6E0913',
              borderBottom: '2px solid #6E0913',
            }}
          >
            <span className="font-display text-[18px]" style={{ fontWeight: 900, letterSpacing: '0.04em' }}>
              ✦ HOT REPLIES
            </span>
            <span className="font-display text-[14px]" style={{ fontStyle: 'italic' }}>
              {data.hot_replies.length} {data.hot_replies.length === 1 ? 'reply needs' : 'replies need'} attention — {data.hot_replies[0].prospect_name}
              {data.hot_replies.length > 1 ? ` and ${data.hot_replies.length - 1} more` : ''}.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <article>
        {/* Masthead */}
        <Masthead
          action={
            <button
              onClick={load}
              disabled={loading}
              className="smallcaps text-[11px] ink-soft hover:ink-text transition-colors tabular-nums"
            >
              {loading ? 'loading…' : 'Refresh ↻'}
            </button>
          }
        />

        {/* Lede paragraph — drop-capped like real newsprint */}
        <div className="font-display ink-soft text-[16px] md:text-[17px] mt-5 mb-6 px-1 drop-cap" style={{ fontStyle: 'italic', lineHeight: 1.55 }}>
          {editorialDeck}
        </div>

        {startMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="brass-text font-display text-[14px] mb-6 px-1"
            style={{ fontStyle: 'italic' }}
          >
            ✦ {startMessage}
          </motion.div>
        )}

        {/* Heavy frame — separates editorial above from the desk below */}
        <div className="brass-rule mt-2" />
        <div className="brass-rule-thin mt-[3px] mb-7" />

        {/* Three-column newsroom grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-8">

          {/* COL A — TODAY'S SENDS (5/12) */}
          <section className="lg:col-span-5 lg:pr-8">
            <Headline scale="kicker" className="mb-3">
              {data.today.run.in_progress ? "Today's Sends · In Progress"
                : data.today.run.done ? "Today's Sends · Done"
                : "Today's Sends"}
            </Headline>
            {data.today.run.in_progress && (
              <div className="flex items-center gap-1.5 smallcaps text-[10px] crimson-text mb-3">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-crimson)' }} />
                live
              </div>
            )}
            <div className="brass-rule-thin mb-4" />

            {data.today.run.total > 0 ? (
              <RunStatusPanel run={data.today.run} stats={data.today.stats} />
            ) : data.today.outreach_paused ? (
              <div>
                <Headline scale="section" italic className="mb-2">Sending is stopped.</Headline>
                <p className="font-display ink-soft text-[14px] mb-3" style={{ fontStyle: 'italic', lineHeight: 1.55 }}>
                  Outreach is globally paused. Resume in Settings to allow sends.
                </p>
                <Button variant="outline" size="sm" onClick={() => router.push('/times/outreach/settings')}>Open settings →</Button>
              </div>
            ) : data.today.ready_to_send === 0 ? (
              <div>
                <Headline scale="section" italic className="mb-2">No prospects ready.</Headline>
                <p className="font-display ink-soft text-[14px] mb-3" style={{ fontStyle: 'italic', lineHeight: 1.55 }}>
                  Import more prospects to keep sending.
                </p>
                <Button variant="outline" size="sm" onClick={() => router.push('/times/outreach/prospects')}>View prospects →</Button>
              </div>
            ) : data.today.total_remaining_capacity === 0 ? (
              <div>
                <Headline scale="section" italic className="mb-2">Today&apos;s sends are done.</Headline>
                <p className="font-display ink-soft text-[14px] mb-3" style={{ fontStyle: 'italic', lineHeight: 1.55 }}>
                  All inboxes at their daily cap. Resumes tomorrow.
                </p>
                <div className="smallcaps text-[11px] ink-soft tabular-nums">
                  {spellNumber(data.today.stats.sent)} letters sent today
                </div>
              </div>
            ) : (
              <div>
                <Headline scale="display" className="mb-3">
                  {spellNumber(data.today.total_remaining_capacity)} emails ready to send.
                </Headline>
                <p className="font-display ink-soft text-[15px] mb-5" style={{ fontStyle: 'italic', lineHeight: 1.65 }}>
                  {data.today.ready_to_send} prospects waiting. Sends respect spacing rules and per-domain limits, so each email goes out on its own clock — no flood, no spam flags, just a steady rhythm.
                </p>
                <BrassButton size="lg" onClick={previewSends} disabled={starting || !data.today.can_start}>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 5v14l11-7L8 5z" /></svg>
                  {starting ? 'Preparing…' : 'Send Now'}
                </BrassButton>
              </div>
            )}
          </section>

          {/* COL B — TODAY'S ACTIVITY (4/12) */}
          <section className="lg:col-span-4 lg:column-rail lg:pr-6">
            <Headline scale="kicker" className="mb-3">Today</Headline>
            <div className="brass-rule-thin mb-4" />

            {data.hot_replies.length > 0 && (
              <div className="mb-5">
                <Headline scale="byline" className="crimson-text mb-2">Hot Replies</Headline>
                <div className="space-y-3">
                  {data.hot_replies.map((r) => (
                    <HotReplyCard
                      key={r.event_id}
                      reply={r}
                      expanded={expandedReply === r.event_id}
                      onToggle={() => setExpandedReply(expandedReply === r.event_id ? null : r.event_id)}
                      onHandle={() => handleReply(r.event_id)}
                      saving={saving}
                    />
                  ))}
                </div>
              </div>
            )}

            {data.warnings.length > 0 && (
              <div className="mb-5">
                <Headline scale="byline" className={`${data.warnings.some((w) => w.severity === 'critical') ? 'crimson-text' : ''} mb-2`}>
                  Editor&apos;s Notice
                </Headline>
                <div className="space-y-2">
                  {data.warnings.map((w) => (
                    <WarningCard key={w.id} warning={w} onAction={() => w.action_href && router.push(w.action_href)} />
                  ))}
                </div>
              </div>
            )}

            {data.fuzzy_matches.length > 0 && (
              <div className="mb-5">
                <Headline scale="byline" className="mb-2">Unsigned Letters</Headline>
                <p className="font-display ink-soft text-[12px] mb-2" style={{ fontStyle: 'italic' }}>
                  Came in without strict threading. Confirm authorship before they auto-classify.
                </p>
                <div className="space-y-2">
                  {data.fuzzy_matches.map((f) => (
                    <FuzzyMatchCard key={f.event_id} match={f} onView={() => router.push(`/outreach/inbox`)} />
                  ))}
                </div>
              </div>
            )}

            {data.warm_replies.length > 0 && (
              <div className="mb-5">
                <Headline scale="byline" className="mb-2">Recent replies — within 24h</Headline>
                <div className="space-y-3">
                  {data.warm_replies.map((r) => (
                    <HotReplyCard
                      key={r.event_id}
                      reply={r}
                      expanded={expandedReply === r.event_id}
                      onToggle={() => setExpandedReply(expandedReply === r.event_id ? null : r.event_id)}
                      onHandle={() => handleReply(r.event_id)}
                      saving={saving}
                      tone="cyan"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All-clear in this column when nothing decisional landed */}
            {data.decision_count === 0 && data.warm_replies.length === 0 && (
              <div className="py-6">
                <Headline scale="section" italic className="mb-2">All clear.</Headline>
                <p className="font-display ink-soft text-[14px]" style={{ fontStyle: 'italic', lineHeight: 1.6 }}>
                  No urgent replies, no warnings. Sending can continue.
                </p>
                <div className="brass-text text-[18px] mt-4">✦</div>
              </div>
            )}
          </section>

          {/* COL C — INBOX STATUS (3/12) */}
          <section className="lg:col-span-3 lg:column-rail">
            <Headline scale="kicker" className="mb-3">Inboxes</Headline>
            <div className="brass-rule-thin mb-4" />

            <div className="space-y-3">
              {data.today.inbox_capacity.map((i) => (
                <InboxRow
                  key={i.id}
                  inbox={i}
                  onChanged={() => { void load(); }}
                />
              ))}
            </div>

            <div className="brass-rule-thin mt-6 mb-4" />

            <Headline scale="kicker" className="mb-3">Auto-Send Schedule</Headline>
            <ScheduleStrip schedule={data.schedule} onChanged={() => { void load(); }} />
          </section>
        </div>

        {/* Heavy bottom frame */}
        <div className="brass-rule-thin mt-10" />
        <div className="brass-rule mt-[3px]" />

        {/* Colophon */}
        <Colophon />
      </article>

      {/* Send preview modal — premium pop-in via AnimatedModal */}
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

/* ───────────── Card components ───────────── */

function HotReplyCard({
  reply, expanded, onToggle, onHandle, saving, tone = 'emerald',
}: {
  reply: HotReply;
  expanded: boolean;
  onToggle: () => void;
  onHandle: () => void;
  saving: boolean;
  tone?: 'emerald' | 'cyan';
}) {
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleSendReply(e?: React.MouseEvent) {
    e?.stopPropagation();
    const body = replyText.trim();
    if (!body) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(apiPath('/api/admin/outreach/reply'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: reply.event_id, body }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendStatus('sent');
        setReplyText('');
      } else {
        setSendStatus('error');
        setSendError(data.error ?? 'Send failed');
      }
    } catch (err) {
      setSendStatus('error');
      setSendError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSending(false);
    }
  }

  const isHot = tone !== 'cyan';
  const accentColor = isHot ? 'var(--color-crimson)' : 'var(--color-brass)';
  const sentDate = new Date(reply.created_at);

  // Letter-style: salutation, body in serif italic, sign-off, dateline.
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className="paper paper-grain rounded-sm"
      style={{
        borderTop: `3px ${isHot ? 'double' : 'solid'} ${accentColor}`,
      }}
    >
      <div className="p-5 cursor-pointer transition-colors" onClick={onToggle}>
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <Headline scale="byline" className={isHot ? 'crimson-text' : 'brass-text'}>
            {isHot ? 'Hot Reply — Action Needed' : 'Reply'}
          </Headline>
          <span className="smallcaps text-[10px] ink-soft tabular-nums shrink-0">
            {sentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {sentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <p className="font-display ink-soft text-[12px] mb-2" style={{ fontStyle: 'italic' }}>
          Re: {reply.original_subject}
        </p>

        <p className="font-display ink-text text-[15px] leading-snug">
          To the Editor —
        </p>

        {!expanded && reply.reply_body && (
          <p className="font-display ink-text text-[15px] leading-relaxed mt-2 line-clamp-3" style={{ fontStyle: 'italic' }}>
            {reply.reply_body.slice(0, 320)}…
          </p>
        )}

        {!expanded && (
          <div className="flex items-baseline justify-between gap-3 mt-3">
            <span className="font-display ink-text text-[14px]" style={{ fontStyle: 'italic' }}>
              — <span className="not-italic font-semibold" style={{ fontVariantCaps: 'all-small-caps', letterSpacing: '0.08em' }}>{reply.prospect_name}</span>
            </span>
            <span className="smallcaps text-[10px] ink-soft hover:ink-text">read full letter →</span>
          </div>
        )}
      </div>

      {expanded && reply.reply_body && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="px-5 pb-5 space-y-4"
        >
          {/* Full body of the letter */}
          <div className="font-display ink-text text-[15px] leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto pr-2" style={{ fontStyle: 'italic' }}>
            {reply.reply_body}
          </div>

          {/* Sign-off */}
          <div className="font-display ink-text text-[14px]">
            — <span className="font-semibold" style={{ fontVariantCaps: 'all-small-caps', letterSpacing: '0.08em' }}>{reply.prospect_name}</span>
            <div className="font-display ink-soft text-[12px] mt-0.5" style={{ fontStyle: 'italic' }}>{reply.prospect_email}</div>
          </div>

          {reply.classifier_rationale && (
            <div className="font-display ink-soft text-[11px]" style={{ fontStyle: 'italic' }}>
              Editor&apos;s margin note: {reply.classifier_rationale}
              {reply.classifier_confidence !== null && (
                <span className="ml-1 brass-text not-italic">· {(Number(reply.classifier_confidence) * 100).toFixed(0)}% sure</span>
              )}
            </div>
          )}

          <div className="brass-rule-thin" />

          {/* Reply composer — a fresh sheet of paper inside the letter */}
          {sendStatus === 'sent' ? (
            <div className="font-display brass-text text-[13px] flex items-center gap-2 italic">
              ✦ Your reply is queued. Marking as handled…
            </div>
          ) : (
            <div onClick={(e) => e.stopPropagation()} className="space-y-3">
              <Headline scale="byline">Your reply</Headline>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Compose a reply to ${reply.prospect_name}…`}
                rows={6}
                className="w-full rounded-sm px-4 py-3 font-display text-[15px] ink-text placeholder:ink-soft focus:outline-none resize-y leading-relaxed"
                style={{
                  fontStyle: 'italic',
                  border: '1px solid rgba(180,145,74,0.30)',
                  backgroundColor: 'rgba(255,235,200,0.06)',
                }}
              />
              {sendError && (
                <p className="font-display crimson-text text-[12px]" style={{ fontStyle: 'italic' }}>
                  ✦ {sendError}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <BrassButton size="sm" onClick={handleSendReply} disabled={sending || !replyText.trim()}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" />
                  </svg>
                  {sending ? 'Sending…' : 'Set Reply'}
                </BrassButton>
                <button
                  onClick={(e?: React.MouseEvent) => { e?.stopPropagation(); onHandle(); }}
                  disabled={saving}
                  className="smallcaps text-[10px] ink-soft hover:ink-text px-2 py-1.5 transition-colors disabled:opacity-50"
                >
                  {saving ? 'marking…' : '✓ mark handled without reply'}
                </button>
                <a
                  href={`mailto:${reply.prospect_email}?subject=${encodeURIComponent(`Re: ${reply.original_subject}`)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="ml-auto smallcaps text-[10px] ink-soft hover:brass-text underline-offset-4 hover:underline"
                >
                  open in Gmail ↗
                </a>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function WarningCard({ warning, onAction }: { warning: Warning; onAction: () => void }) {
  const isCritical = warning.severity === 'critical';
  const accentClass = isCritical ? 'crimson-text' : 'brass-text';
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 py-3"
      style={{ borderLeft: `3px solid ${isCritical ? 'var(--color-crimson)' : 'var(--color-brass)'}`, paddingLeft: '14px' }}
    >
      <div className={`shrink-0 mt-0.5 ${accentClass}`}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <Headline scale="section" italic className={isCritical ? 'crimson-text' : ''}>{warning.title}</Headline>
        <p className="font-display ink-soft text-[13px] mt-0.5">{warning.body}</p>
      </div>
      {warning.action_label && (
        <button
          onClick={onAction}
          className="smallcaps text-[10px] ink-text hover:brass-text underline-offset-4 hover:underline"
        >
          {warning.action_label} →
        </button>
      )}
    </motion.div>
  );
}

function RunStat({ label, value, accent }: { label: string; value: number; accent?: 'brass' | 'crimson' }) {
  const colorClass = accent === 'brass' ? 'brass-text' : accent === 'crimson' ? 'crimson-text' : 'ink-text';
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="smallcaps text-[10px] ink-soft">{label}</span>
      <span className={`text-[18px] font-semibold tabular-nums ${colorClass}`}>{value}</span>
    </span>
  );
}

function RunStatusPanel({
  run,
  stats,
}: {
  run: RunState;
  stats: { sent: number; opened_real: number; clicked: number; replied: number; bounced: number };
}) {
  const pct = run.total > 0 ? Math.round((run.sent / run.total) * 100) : 0;
  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="space-y-5">
      {/* Headline + progress bar */}
      <div>
        <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
          <div>
            <span className="font-display text-[36px] ink-text tabular-nums" style={{ fontWeight: 900 }}>{run.sent}</span>
            <span className="ink-soft mx-2 font-display">/</span>
            <span className="font-display text-[20px] ink-soft tabular-nums">{run.total}</span>
            <span className="smallcaps text-[11px] ink-soft ml-2">letters sent</span>
          </div>
          <div className="font-display ink-soft text-[12px] tabular-nums" style={{ fontStyle: 'italic' }}>
            {run.done
              ? `Done at ${fmt(run.last_scheduled)}`
              : run.next_pending
                ? <>Next send at <span className="ink-text not-italic">{fmt(run.next_pending)}</span></>
                : 'Sending in progress…'}
          </div>
        </div>
        <div className="h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(11,27,58,0.10)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full"
            style={{ backgroundColor: 'var(--color-brass)' }}
          />
        </div>
      </div>

      {/* Window + status counts — typeset numbers in a row, brass dots between */}
      <div className="flex items-baseline gap-4 flex-wrap font-display tabular-nums">
        <RunStat label="Pending" value={run.pending} />
        <span className="brass-text">·</span>
        <RunStat label="Sending" value={run.sending} />
        <span className="brass-text">·</span>
        <RunStat label="Sent" value={run.sent} accent="brass" />
        <span className="brass-text">·</span>
        <RunStat label="Failed" value={run.failed} accent={run.failed > 0 ? 'crimson' : undefined} />
      </div>

      {/* Per-inbox progress */}
      {run.per_inbox.length > 0 && (
        <div className="space-y-2">
          <Headline scale="byline">By inbox</Headline>
          {run.per_inbox.filter((b) => b.total > 0).map((b) => {
            const inboxPct = b.total > 0 ? (b.sent / b.total) * 100 : 0;
            return (
              <div key={b.inbox_id} className="flex items-center gap-3 text-[12px]">
                <span className="font-display ink-text italic w-[220px] truncate" style={{ fontStyle: 'italic' }}>{b.email}</span>
                <div className="flex-1 h-[2px] overflow-hidden" style={{ backgroundColor: 'rgba(11,27,58,0.12)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${inboxPct}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full"
                    style={{ backgroundColor: 'var(--color-brass)' }}
                  />
                </div>
                <span className="font-display tabular-nums w-[64px] text-right ink-text">
                  <span className="font-semibold">{b.sent}</span>
                  <span className="ink-soft mx-0.5">/</span>
                  <span className="ink-soft">{b.total}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Window times */}
      {run.first_scheduled && run.last_scheduled && (
        <div className="font-display ink-soft text-[12px] flex items-center gap-3 pt-3 relative" style={{ fontStyle: 'italic' }}>
          <div className="brass-rule-thin absolute top-0 left-0 right-0" />
          <span>Window: <span className="ink-text not-italic tabular-nums">{fmt(run.first_scheduled)} → {fmt(run.last_scheduled)}</span></span>
          <span className="ml-auto">{stats.opened_real > 0 && <>{stats.opened_real} opens · </>}{stats.clicked > 0 && <>{stats.clicked} clicks · </>}{stats.replied > 0 && <>{stats.replied} replies</>}</span>
        </div>
      )}

      {run.done && (
        <div className="font-display brass-text text-[13px] flex items-center gap-2 italic">
          ✦ All {spellNumber(run.total)} letters away. Tomorrow&apos;s edition awaits — fresh prospects, no duplicates.
        </div>
      )}
    </div>
  );
}

function FuzzyMatchCard({ match, onView }: { match: FuzzyMatch; onView: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex items-start gap-3 py-3"
      style={{ borderLeft: '2px dotted var(--color-brass)', paddingLeft: '14px' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <Headline scale="section" italic className="truncate">{match.prospect_name}</Headline>
          <span className="font-display ink-soft text-[12px] truncate" style={{ fontStyle: 'italic' }}>{match.prospect_email}</span>
        </div>
        {match.reply_body && <p className="font-display ink-soft text-[12px] line-clamp-2">{match.reply_body.slice(0, 200)}…</p>}
        <p className="smallcaps text-[10px] ink-soft mt-1 tabular-nums">
          {new Date(match.created_at).toLocaleString()}
        </p>
      </div>
      <button
        onClick={onView}
        className="smallcaps text-[10px] ink-text hover:brass-text underline-offset-4 hover:underline"
      >
        Review →
      </button>
    </motion.div>
  );
}

/* ───────── Inbox row + edit modal ───────── */

function InboxRow({ inbox, onChanged }: { inbox: InboxCapacity; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setBusy(true);
    try {
      await fetch(apiPath('/api/admin/outreach/settings'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_inbox_active', inbox_id: inbox.id }),
      });
      onChanged();
    } finally { setBusy(false); }
  }

  const windowLabel = inbox.start_hour != null || inbox.end_hour != null
    ? `${String(inbox.start_hour ?? 0).padStart(2, '0')}:00–${String(inbox.end_hour ?? 24).padStart(2, '0')}:00`
    : 'any hour';

  // Two-line typeset desk entry: top = chip + email + edit; bottom = counter · window · paused
  return (
    <>
      <div className={`${inbox.active ? '' : 'opacity-50'}`}>
        <div className="flex items-center gap-2">
          {/* Ink/no-ink chip serving as the toggle */}
          <button
            type="button"
            aria-label={inbox.active ? 'Stand down inbox' : 'Bring inbox into rotation'}
            disabled={busy}
            onClick={toggleActive}
            className="relative w-3.5 h-3.5 rounded-full border-2 transition shrink-0"
            style={{
              borderColor: 'var(--color-ink)',
              backgroundColor: inbox.active ? 'var(--color-ink)' : 'transparent',
            }}
            title={inbox.active ? 'In tonight’s edition' : 'Held back from this edition'}
          />
          <span
            className={`font-display ink-text text-[14px] flex-1 min-w-0 truncate ${inbox.active ? '' : 'line-through ink-soft'}`}
            style={{ fontStyle: 'italic' }}
          >
            {inbox.email}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="smallcaps text-[10px] ink-soft hover:ink-text transition-colors shrink-0"
            aria-label="Edit send settings"
          >
            edit
          </button>
        </div>
        <div className="flex items-baseline gap-2 mt-1 ml-[22px]">
          <span className="font-display tabular-nums ink-text text-[13px]">
            <span className="font-semibold">{inbox.sent_today}</span>
            <span className="ink-soft mx-0.5">/</span>
            <span className="ink-soft">{inbox.daily_cap}</span>
          </span>
          <span className="brass-text text-[10px]">·</span>
          <span className="font-display ink-soft text-[12px] tabular-nums">{windowLabel}</span>
          {inbox.paused && (
            <>
              <span className="brass-text text-[10px]">·</span>
              <span className="smallcaps text-[10px] crimson-text">held</span>
            </>
          )}
        </div>
      </div>
      <InboxEditModal open={editing} inbox={inbox} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged(); }} />
    </>
  );
}

function InboxEditModal({
  open, inbox, onClose, onSaved,
}: { open: boolean; inbox: InboxCapacity; onClose: () => void; onSaved: () => void }) {
  const [dailyCap, setDailyCap] = useState(inbox.daily_cap);
  const [startHour, setStartHour] = useState<number | null>(inbox.start_hour);
  const [endHour, setEndHour] = useState<number | null>(inbox.end_hour);
  const [minSec, setMinSec] = useState(inbox.min_spacing_seconds);
  const [maxSec, setMaxSec] = useState(inbox.max_spacing_seconds);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (startHour != null && endHour != null && startHour >= endHour) {
      setErr('Start hour must be earlier than end hour');
      return;
    }
    if (minSec > maxSec) {
      setErr('Min spacing must be ≤ max spacing');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(apiPath('/api/admin/outreach/settings'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_inbox',
          inbox_id: inbox.id,
          daily_cap: dailyCap,
          start_hour: startHour,
          end_hour: endHour,
          min_spacing_seconds: minSec,
          max_spacing_seconds: maxSec,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Failed to save');
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally { setSaving(false); }
  }

  return (
    <AnimatedModal
      open={open}
      onClose={onClose}
      panelClassName="rounded-sm p-7 max-w-md w-full"
      panelStyle={{
        backgroundColor: '#13100A',
        backgroundImage: 'radial-gradient(800px 500px at 50% 0%, rgba(180,145,74,0.10), transparent 60%)',
        border: '1px solid rgba(180,145,74,0.30)',
      }}
    >
      <div>
        <div className="brass-rule mb-4" />
        <Headline scale="byline" className="mb-1">Send settings</Headline>
        <Headline scale="section" italic className="mb-1">Edit {inbox.email.split('@')[0]} inbox.</Headline>
        <p className="font-display ink-soft text-[12px] mb-5" style={{ fontStyle: 'italic' }}>{inbox.email}</p>

        <div className="space-y-3">
          <Field label="Letters per day">
            <input
              type="number" min={1} max={500}
              value={dailyCap}
              onChange={(e) => setDailyCap(Number(e.target.value))}
              className="w-full bg-transparent border-b ink-text px-1 py-1.5 text-[14px] font-display tabular-nums focus:outline-none"
              style={{ borderColor: 'var(--color-ink)' }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Earliest hour">
              <input
                type="number" min={0} max={23}
                value={startHour ?? ''}
                placeholder="any"
                onChange={(e) => setStartHour(e.target.value === '' ? null : Number(e.target.value))}
                className="w-full bg-transparent border-b ink-text px-1 py-1.5 text-[14px] font-display tabular-nums focus:outline-none"
                style={{ borderColor: 'var(--color-ink)' }}
              />
            </Field>
            <Field label="Latest hour">
              <input
                type="number" min={1} max={24}
                value={endHour ?? ''}
                placeholder="any"
                onChange={(e) => setEndHour(e.target.value === '' ? null : Number(e.target.value))}
                className="w-full bg-transparent border-b ink-text px-1 py-1.5 text-[14px] font-display tabular-nums focus:outline-none"
                style={{ borderColor: 'var(--color-ink)' }}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Earliest gap (sec)">
              <input
                type="number" min={30} max={3600}
                value={minSec}
                onChange={(e) => setMinSec(Number(e.target.value))}
                className="w-full bg-transparent border-b ink-text px-1 py-1.5 text-[14px] font-display tabular-nums focus:outline-none"
                style={{ borderColor: 'var(--color-ink)' }}
              />
            </Field>
            <Field label="Latest gap (sec)">
              <input
                type="number" min={30} max={3600}
                value={maxSec}
                onChange={(e) => setMaxSec(Number(e.target.value))}
                className="w-full bg-transparent border-b ink-text px-1 py-1.5 text-[14px] font-display tabular-nums focus:outline-none"
                style={{ borderColor: 'var(--color-ink)' }}
              />
            </Field>
          </div>

          <p className="font-display ink-soft text-[11px]" style={{ fontStyle: 'italic' }}>
            Empty earliest/latest hour = no time restriction. The gap is the random pause between consecutive letters from this desk.
          </p>
        </div>

        {err && <p className="text-[12px] crimson-text mt-3 font-display" style={{ fontStyle: 'italic' }}>{err}</p>}

        <div className="brass-rule-thin mt-5 mb-4" />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="smallcaps text-[11px] ink-soft hover:ink-text transition-colors px-2"
          >
            cancel
          </button>
          <BrassButton size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</BrassButton>
        </div>
      </div>
    </AnimatedModal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="smallcaps text-[10px] ink-soft">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

/* ───────── Daily auto-trigger settings strip ───────── */

function ScheduleStrip({
  schedule, onChanged,
}: { schedule: { daily_run_enabled: boolean; daily_run_hour: number; daily_run_last_at: string | null }; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [editingHour, setEditingHour] = useState(false);
  const [hour, setHour] = useState(schedule.daily_run_hour);

  async function toggle() {
    setBusy(true);
    try {
      await fetch(apiPath('/api/admin/outreach/settings'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_schedule', daily_run_enabled: !schedule.daily_run_enabled }),
      });
      onChanged();
    } finally { setBusy(false); }
  }

  async function saveHour() {
    setBusy(true);
    try {
      await fetch(apiPath('/api/admin/outreach/settings'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_schedule', daily_run_hour: hour }),
      });
      setEditingHour(false);
      onChanged();
    } finally { setBusy(false); }
  }

  const lastFired = schedule.daily_run_last_at
    ? new Date(schedule.daily_run_last_at).toLocaleString()
    : 'never';

  return (
    <div className="mt-6 pt-4 flex items-center gap-3 flex-wrap text-[11px] relative">
      <div className="brass-rule-thin absolute top-0 left-0 right-0" />
      {/* Ink/no-ink chip toggle, same language as inbox row */}
      <button
        type="button"
        aria-label={schedule.daily_run_enabled ? 'Turn off auto-send' : 'Turn on auto-send'}
        disabled={busy}
        onClick={toggle}
        className="relative w-3.5 h-3.5 rounded-full border-2 transition shrink-0"
        style={{
          borderColor: 'var(--color-ink)',
          backgroundColor: schedule.daily_run_enabled ? 'var(--color-ink)' : 'transparent',
        }}
      />
      <div className="leading-tight">
        <Headline scale="byline">
          Auto-press
          {schedule.daily_run_enabled && <span className="brass-text ml-1">· armed</span>}
        </Headline>
        <div className="font-display ink-soft text-[12px]" style={{ fontStyle: 'italic' }}>
          {schedule.daily_run_enabled ? (
            <>
              issues each day at{' '}
              {editingHour ? (
                <span className="inline-flex items-center gap-2 not-italic font-display">
                  <input
                    type="number" min={0} max={23}
                    value={hour}
                    onChange={(e) => setHour(Number(e.target.value))}
                    className="w-10 bg-transparent border-b ink-text px-0.5 py-0 tabular-nums focus:outline-none"
                    style={{ borderColor: 'var(--color-ink)' }}
                  />
                  <span className="ink-text tabular-nums">:00</span>
                  <button onClick={saveHour} disabled={busy} className="smallcaps text-[10px] ink-text hover:brass-text">save</button>
                  <button onClick={() => { setHour(schedule.daily_run_hour); setEditingHour(false); }} className="smallcaps text-[10px] ink-soft hover:ink-text">cancel</button>
                </span>
              ) : (
                <button
                  onClick={() => setEditingHour(true)}
                  className="ink-text font-display tabular-nums underline-offset-2 hover:underline"
                  style={{ fontStyle: 'normal', textDecoration: 'underline', textDecorationColor: 'var(--color-brass)', textDecorationThickness: '1px' }}
                >
                  {String(schedule.daily_run_hour).padStart(2, '0')}:00
                </button>
              )}
              {' '}server time · last issue went out {lastFired}
            </>
          ) : (
            <>not armed — flip the chip to issue an edition every day at the same hour</>
          )}
        </div>
      </div>
    </div>
  );
}
