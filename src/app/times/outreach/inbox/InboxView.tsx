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

interface Reply {
  event_id: string;
  send_id: string;
  created_at: string;
  reply_body: string;
  reply_classification: string | null;
  reply_match_confidence: string | null;
  raw_headers: { from?: string; subject?: string; date?: string; rationale?: string; classifier_confidence?: number } | null;
  original_subject: string;
  sent_at: string;
  follow_up_number: number;
  prospect_id: string;
  prospect_name: string;
  prospect_email: string;
  prospect_status: string;
}

const CLASS_LABEL: Record<string, string> = {
  hot: 'hot lead',
  warm: 'warm',
  cold: 'cold',
  remove: 'remove me',
  ooo: 'out of office',
  bounce: 'bounce',
  uncertain: 'unsigned',
};

const CLASS_TONE: Record<string, 'crimson' | 'brass' | 'ink-soft'> = {
  hot: 'crimson',
  warm: 'brass',
  remove: 'crimson',
  bounce: 'crimson',
  cold: 'ink-soft',
  ooo: 'ink-soft',
  uncertain: 'ink-soft',
};

const CLASSES = ['', 'hot', 'warm', 'cold', 'remove', 'ooo', 'uncertain', 'bounce'];

export default function InboxView() {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [byClass, setByClass] = useState<Array<{ reply_classification: string | null; n: number }>>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('class', filter);
      const r = await fetch(apiPath(`/api/admin/outreach/inbox?${params}`));
      const d = await r.json();
      setReplies(d.replies ?? []);
      setByClass(d.by_class ?? []);
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Live polling: silently refresh inbox every 5s while tab is visible. New
  // replies pop in via AnimatePresence stagger.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        try {
          const params = new URLSearchParams();
          if (filter) params.set('class', filter);
          const r = await fetch(apiPath(`/api/admin/outreach/inbox?${params}`), { cache: 'no-store' });
          const d = await r.json();
          if (!alive) return;
          if (d.replies) setReplies(d.replies);
          if (d.by_class) setByClass(d.by_class);
        } catch {}
      }
      if (alive) timer = setTimeout(tick, 5000);
    };
    timer = setTimeout(tick, 5000);
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [filter]);

  async function reclassify(event_id: string, classification: string) {
    setSaving(true);
    try {
      await fetch(apiPath('/api/admin/outreach/inbox'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reclassify', event_id, classification }),
      });
      await load();
    } finally { setSaving(false); }
  }

  async function confirmFuzzy(event_id: string) {
    setSaving(true);
    try {
      await fetch(apiPath('/api/admin/outreach/inbox'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_fuzzy', event_id }),
      });
      await load();
    } finally { setSaving(false); }
  }

  const total = byClass.reduce((a, b) => a + b.n, 0);

  return (
    <div className="relative">
      <PaperGrainDefs />
      <PaperCard padding="lg" as="article" className="md:px-10 lg:px-14 lg:py-10">
        <SectionMasthead
          kicker="Replies"
          title="Inbox"
          description="Every reply that has come in. Hot and warm leads rise to the top. Unconfirmed replies wait for review."
          action={
            <span className="smallcaps text-[11px] ink-soft tabular-nums">
              <span className="ink-text font-semibold">{total.toLocaleString()}</span> {total === 1 ? 'reply' : 'replies'}
            </span>
          }
        />

        {/* Class chips */}
        <div className="flex items-baseline gap-x-4 gap-y-1 flex-wrap mt-5 mb-4">
          {CLASSES.map((c) => {
            const count = c === '' ? total : byClass.find((x) => x.reply_classification === c)?.n ?? 0;
            const isActive = filter === c;
            return (
              <button
                key={c || 'all'}
                onClick={() => setFilter(c)}
                className="smallcaps text-[10px] tracking-[0.18em] transition-colors"
                style={{
                  color: isActive ? 'var(--color-ink)' : 'var(--color-ink-soft)',
                  borderBottom: isActive ? '2px solid var(--color-brass)' : '2px solid transparent',
                  paddingBottom: '2px',
                }}
              >
                {c === '' ? 'All' : CLASS_LABEL[c] ?? c} <span className="ml-1 ink-soft tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="brass-rule-thin mb-3" />

        {/* Feed */}
        {loading && replies.length === 0 ? (
          <p className="font-display ink-soft text-[14px] py-12 text-center" style={{ fontStyle: 'italic' }}>Loading replies…</p>
        ) : replies.length === 0 ? (
          <div className="text-center py-12">
            <div className="brass-text text-[18px] mb-2">✦</div>
            <Headline scale="section" italic className="mb-1">No replies yet.</Headline>
            <p className="font-display ink-soft text-[12px]" style={{ fontStyle: 'italic' }}>
              Once your emails go out and people respond, their replies will land here.
              The poller runs every ten minutes.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence mode="popLayout">
              {replies.map((r, idx) => (
                <InboxReplyRow
                  key={r.event_id}
                  reply={r}
                  index={idx}
                  expanded={expanded === r.event_id}
                  onToggle={() => setExpanded(expanded === r.event_id ? null : r.event_id)}
                  onReclassify={(c) => reclassify(r.event_id, c)}
                  onConfirmFuzzy={() => confirmFuzzy(r.event_id)}
                  onRefresh={load}
                  saving={saving}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}

        <Colophon />
      </PaperCard>
    </div>
  );
}

function InboxReplyRow({
  reply, index, expanded, onToggle, onReclassify, onConfirmFuzzy, onRefresh, saving,
}: {
  reply: Reply;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onReclassify: (classification: string) => void;
  onConfirmFuzzy: () => void;
  onRefresh: () => void | Promise<void>;
  saving: boolean;
}) {
  const cls = reply.reply_classification ?? 'uncertain';
  const isFuzzy = reply.reply_match_confidence === 'fuzzy';
  const tone = CLASS_TONE[cls] ?? 'ink-soft';
  const toneClass = tone === 'crimson' ? 'crimson-text' : tone === 'brass' ? 'brass-text' : 'ink-soft';

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendReply() {
    const body = replyText.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(apiPath('/api/admin/outreach/reply'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: reply.event_id, body }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        setReplyText('');
        setTimeout(() => void onRefresh(), 600);
      } else {
        setError(data.error ?? 'Send failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSending(false);
    }
  }

  const isHot = cls === 'hot';
  const accent = isHot ? 'var(--color-crimson)' : 'var(--color-brass)';

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
      animate={{
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: {
          duration: 0.55,
          delay: Math.min(index, 12) * 0.04,
          ease: [0.16, 1, 0.3, 1],
        },
      }}
      exit={{ opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.2 } }}
      whileHover={{
        y: -2,
        boxShadow: isHot
          ? '0 14px 32px -18px rgba(211,45,64,0.55)'
          : '0 14px 32px -18px rgba(201,166,97,0.45)',
      }}
      className="paper paper-grain rounded-sm cursor-pointer relative"
      style={{ borderTop: `2px ${isHot ? 'double' : 'solid'} ${accent}` }}
      onClick={onToggle}
    >
      <div className="px-5 py-4">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <span className={`smallcaps text-[10px] ${toneClass}`}>
            {CLASS_LABEL[cls] ?? cls}
            {isFuzzy && <span className="brass-text ml-2">· unsigned</span>}
          </span>
          <span className="smallcaps text-[10px] ink-soft tabular-nums shrink-0">
            {new Date(reply.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-display ink-text text-[15px] font-semibold truncate">{reply.prospect_name}</span>
          <span className="font-display ink-soft text-[12px] truncate" style={{ fontStyle: 'italic' }}>{reply.prospect_email}</span>
        </div>
        <p className="font-display ink-soft text-[12px] mb-2" style={{ fontStyle: 'italic' }}>Re: {reply.original_subject}</p>

        {!expanded && reply.reply_body && (
          <p className="font-display ink-text text-[14px] leading-relaxed line-clamp-2" style={{ fontStyle: 'italic' }}>
            “{reply.reply_body.slice(0, 240)}…”
          </p>
        )}
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-5 pb-5 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="brass-rule-thin" />
          <div className="font-display ink-text text-[15px] leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto pr-2" style={{ fontStyle: 'italic' }}>
            {reply.reply_body}
          </div>
          <div className="font-display ink-text text-[14px]">
            — <span className="font-semibold" style={{ fontVariantCaps: 'all-small-caps', letterSpacing: '0.08em' }}>{reply.prospect_name}</span>
          </div>

          {reply.raw_headers?.rationale && (
            <div className="font-display ink-soft text-[11px]" style={{ fontStyle: 'italic' }}>
              Editor&apos;s margin note: {reply.raw_headers.rationale}
              {reply.raw_headers.classifier_confidence !== undefined && (
                <span className="ml-1 brass-text not-italic">· {(reply.raw_headers.classifier_confidence * 100).toFixed(0)}% sure</span>
              )}
            </div>
          )}

          <div className="brass-rule-thin" />

          {/* Reply composer */}
          {sent ? (
            <div className="font-display brass-text text-[13px] flex items-center gap-2 italic">
              ✦ Reply queued.
            </div>
          ) : (
            <div className="space-y-3">
              <Headline scale="byline">Your reply</Headline>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Compose a reply to ${reply.prospect_name}…`}
                rows={5}
                className="w-full rounded-sm px-4 py-3 font-display text-[15px] ink-text placeholder:ink-soft focus:outline-none resize-y leading-relaxed"
                style={{
                  fontStyle: 'italic',
                  border: '1px solid rgba(180,145,74,0.30)',
                  backgroundColor: 'rgba(255,235,200,0.06)',
                }}
              />
              {error && (
                <p className="font-display crimson-text text-[12px]" style={{ fontStyle: 'italic' }}>✦ {error}</p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <BrassButton size="sm" onClick={handleSendReply} disabled={sending || !replyText.trim()}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" />
                  </svg>
                  {sending ? 'Sending…' : 'Set Reply'}
                </BrassButton>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
            <span className="smallcaps text-[10px] ink-soft">Re-classify:</span>
            {(['hot', 'warm', 'cold', 'remove', 'ooo', 'uncertain'] as const).map((c) => (
              <button
                key={c}
                onClick={(e) => { e.stopPropagation(); onReclassify(c); }}
                disabled={saving || cls === c}
                className="smallcaps text-[10px] tracking-[0.18em] transition-colors disabled:opacity-100"
                style={{
                  color: cls === c ? 'var(--color-ink)' : 'var(--color-ink-soft)',
                  borderBottom: cls === c ? '2px solid var(--color-brass)' : '2px solid transparent',
                  paddingBottom: '2px',
                }}
              >
                {CLASS_LABEL[c] ?? c}
              </button>
            ))}
            {isFuzzy && (
              <BrassButton size="sm" onClick={(e) => { e.stopPropagation(); onConfirmFuzzy(); }} disabled={saving}>
                Confirm authorship
              </BrassButton>
            )}
            <a
              href={`mailto:${reply.prospect_email}?subject=${encodeURIComponent(`Re: ${reply.original_subject}`)}`}
              onClick={(e) => e.stopPropagation()}
              className="ml-auto smallcaps text-[10px] ink-soft hover:brass-text underline-offset-4 hover:underline"
            >
              open in Gmail ↗
            </a>
          </div>
        </motion.div>
      )}
    </motion.li>
  );
}
