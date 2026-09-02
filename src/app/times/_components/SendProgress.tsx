'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Headline } from './Headline';
import { AnimatedNumber } from './AnimatedNumber';
import { apiPath } from '@/lib/api-path';

type ProgressEvent =
  | { phase: 'checking_caps'; msg: string }
  | { phase: 'checking_domains'; msg: string }
  | { phase: 'fetching_prospects'; msg: string; capacity: number }
  | { phase: 'queueing'; done: number; total: number; prospect_name: string; inbox_email: string; scheduled_for: string }
  | { phase: 'kicking_worker'; msg: string }
  | { phase: 'done'; enqueued: number; skipped_no_email?: number; skipped_suppressed?: number; skipped_merge_tags?: number; first_scheduled_for: string | null; last_scheduled_for: string | null; inboxes_used?: Array<{ email: string; assigned: number }>; reason?: string }
  | { phase: 'error'; reason: string };

export type SendDoneSummary = Extract<ProgressEvent, { phase: 'done' }>;

const PHASE_LABEL: Record<string, string> = {
  checking_caps: 'Reading inbox capacity',
  checking_domains: 'Checking domain ceilings',
  fetching_prospects: 'Pulling letter drafts',
  queueing: 'Setting today’s queue',
  kicking_worker: 'Handing off to the worker',
  done: 'Done',
  error: 'Error',
};

interface Props {
  /** When this becomes truthy, the progress run starts. */
  active: boolean;
  /** Called once the stream finishes successfully */
  onDone: (summary: SendDoneSummary) => void;
  /** Called if the stream errors */
  onError?: (reason: string) => void;
}

/**
 * Live send-queue builder. Hits /api/outreach/send/start/stream and shows
 * what stage the job is in, plus a per-prospect ticker. Events are buffered
 * and drained at a steady editorial cadence so the experience stays
 * premium even if the API bursts everything back instantly.
 */
export function SendProgress({ active, onDone, onError }: Props) {
  const [phase, setPhase] = useState<string>('connecting');
  const [phaseMsg, setPhaseMsg] = useState<string>('Opening line to the press…');
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [lastProspect, setLastProspect] = useState<string>('');
  const [lastInbox, setLastInbox] = useState<string>('');
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number>(0);

  // Stash callbacks in refs so polling re-renders on the parent don't
  // change the effect's deps and restart the run mid-flight.
  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    if (!active) return;
    startedAt.current = Date.now();
    setPhase('connecting');
    setPhaseMsg('Opening line to the press…');
    setDone(0);
    setTotal(0);
    setLastProspect('');
    setLastInbox('');
    setElapsed(0);

    const tick = setInterval(() => {
      setElapsed((Date.now() - startedAt.current) / 1000);
    }, 100);

    let cancelled = false;

    function applyEvent(evt: ProgressEvent) {
      if (cancelled) return;
      setPhase(evt.phase);
      setPhaseMsg(PHASE_LABEL[evt.phase] ?? evt.phase);
      if (evt.phase === 'fetching_prospects') {
        setTotal(evt.capacity);
      } else if (evt.phase === 'queueing') {
        setDone(evt.done);
        setTotal(evt.total);
        setLastProspect(evt.prospect_name);
        setLastInbox(evt.inbox_email);
      } else if (evt.phase === 'done') {
        onDoneRef.current(evt);
      } else if (evt.phase === 'error') {
        onErrorRef.current?.(evt.reason);
      }
    }

    // Events are buffered into a queue and drained at a steady cadence.
    // Even if the backend bursts all events back in <100ms the user still
    // sees a premium preparation animation. Minimum total duration of
    // ~3.2s is enforced so empty/no-op runs still feel deliberate.
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const queue: ProgressEvent[] = [];
    let producerDone = false;
    const runStartedAt = Date.now();
    const MIN_TOTAL_DURATION_MS = 3200;

    // Consumer: drains the queue with minimum gaps per event type
    (async () => {
      let lastAppliedAt = 0;
      // Initial hold so the "Going to Press" header is visible before any
      // event arrives, no matter how fast the backend responds.
      await wait(420);
      while (!cancelled) {
        if (queue.length === 0) {
          if (producerDone) break;
          await wait(15);
          continue;
        }
        const evt = queue.shift()!;
        const minGap =
          evt.phase === 'queueing' ? 80
          : evt.phase === 'done' ? 220
          : evt.phase === 'kicking_worker' ? 460
          : evt.phase === 'fetching_prospects' ? 540
          : evt.phase === 'checking_domains' ? 460
          : evt.phase === 'checking_caps' ? 480
          : 100;
        const since = Date.now() - lastAppliedAt;
        if (lastAppliedAt && since < minGap) await wait(minGap - since);
        // For the terminal `done` event, also enforce a global minimum
        // total duration so the user sees the full progression even when
        // the backend has nothing to do.
        if (evt.phase === 'done') {
          const elapsed = Date.now() - runStartedAt;
          if (elapsed < MIN_TOTAL_DURATION_MS) await wait(MIN_TOTAL_DURATION_MS - elapsed);
        }
        if (cancelled) return;
        applyEvent(evt);
        lastAppliedAt = Date.now();
      }
    })();

    // Producer: reads the stream and pushes parsed events
    (async () => {
      try {
        const res = await fetch(apiPath('/api/outreach/send/start/stream'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (!cancelled) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;
          buf += decoder.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf('\n')) !== -1) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            try {
              queue.push(JSON.parse(line) as ProgressEvent);
            } catch {
              /* ignore malformed line */
            }
          }
        }
      } catch (e) {
        if (!cancelled) onErrorRef.current?.(e instanceof Error ? e.message : 'Stream failed');
      } finally {
        producerDone = true;
        clearInterval(tick);
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [active]);

  const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const isQueueing = phase === 'queueing';
  const isFinishing = phase === 'kicking_worker' || phase === 'done';

  return (
    <div className="space-y-5">
      {/* Phase line */}
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <Headline scale="byline" className="brass-text">{phaseMsg}…</Headline>
          <span className="smallcaps text-[10px] ink-soft tabular-nums">
            {elapsed.toFixed(1)}s
          </span>
        </div>
        <div className="brass-rule-thin mt-2" />
      </div>

      {/* Counter */}
      <div className="flex items-baseline gap-3">
        <div className="flex items-baseline gap-1.5">
          <AnimatedNumber
            value={done}
            className="font-display ink-text tabular-nums"
            style={{ fontWeight: 900, fontSize: '40px', lineHeight: 1 }}
          />
          <span className="font-display ink-soft text-[16px] tabular-nums" style={{ fontStyle: 'italic' }}>
            of {total || '—'}
          </span>
        </div>
        <span className="font-display ink-soft text-[12px]" style={{ fontStyle: 'italic' }}>
          {isFinishing ? 'queued' : isQueueing ? 'queued so far' : 'preparing…'}
        </span>
      </div>

      {/* Progress bar with shimmer */}
      <div className="relative h-[3px] w-full overflow-hidden" style={{ backgroundColor: 'rgba(242,235,218,0.10)' }}>
        <motion.div
          className="absolute inset-y-0 left-0"
          style={{
            backgroundColor: 'var(--color-brass)',
            boxShadow: '0 0 10px rgba(201,166,97,0.55)',
          }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 220, damping: 30 }}
        />
        {pct > 0 && pct < 100 && (
          <motion.span
            aria-hidden
            className="absolute inset-y-0 w-[35%]"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,240,200,0.8) 50%, transparent 100%)',
              mixBlendMode: 'screen',
            }}
            animate={{ x: ['-110%', '320%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      {/* Live prospect ticker */}
      <div className="min-h-[44px]">
        <AnimatePresence mode="popLayout">
          {lastProspect && (
            <motion.div
              key={`${done}-${lastProspect}`}
              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-baseline justify-between gap-3"
            >
              <div className="min-w-0">
                <span className="smallcaps text-[10px] ink-soft mr-2">queued</span>
                <span className="font-display ink-text text-[14px] font-semibold truncate">
                  {lastProspect}
                </span>
              </div>
              <span className="font-display ink-soft text-[11px] truncate" style={{ fontStyle: 'italic' }}>
                via {lastInbox}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Why-it-takes-time hint */}
      <div className="font-display ink-soft text-[11px] leading-relaxed" style={{ fontStyle: 'italic' }}>
        Each letter is checked against the block list, the merge tags are audited,
        an inbox is picked, and a send time is computed before it lands in the queue.
        That’s {total > 0 ? `~${total * 3}` : 'a few'} round-trips to the database.
      </div>
    </div>
  );
}
