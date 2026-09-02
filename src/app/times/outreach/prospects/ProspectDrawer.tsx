'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperGrainDefs } from '../../_components/PaperGrainDefs';
import { Headline } from '../../_components/Headline';
import { BrassButton } from '../../_components/BrassButton';
import { ModalPortal } from '../../_components/ModalPortal';
import { apiPath } from '@/lib/api-path';

interface ProspectDetail {
  id: string;
  name: string;
  email: string | null;
  website: string | null;
  phone: string | null;
  city: string | null;
  principal_name: string | null;
  status: string;
  campaign_location: string | null;
  campaign_niche: string | null;
  analysis: { issues?: Array<{ problem: string; impact: string; fix: string }> } | null;
  social_links: { instagram?: string | null; x?: string | null; linkedin?: string | null } | null;
  draft_archetype: string | null;
  draft_subject: string | null;
  draft_body: string | null;
}

interface SendEntry {
  id: string;
  subject: string;
  follow_up_number: number;
  sent_at: string;
  open_count_real: number;
  click_count: number;
  replied: boolean;
  bounced: boolean;
  unsubscribed: boolean;
}

interface EventEntry {
  id: string;
  send_id: string;
  event_type: string;
  open_type: string | null;
  url: string | null;
  reply_classification: string | null;
  reply_body: string | null;
  created_at: string;
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

const EVENT_LABEL: Record<string, string> = {
  delivered: 'delivered',
  open: 'opened',
  click: 'clicked through',
  reply: 'replied',
  bounce: 'bounced',
  unsubscribe: 'unsubscribed',
  complaint: 'complaint filed',
};

const EVENT_TONE: Record<string, 'brass' | 'crimson' | 'ink-soft'> = {
  delivered: 'brass',
  open: 'brass',
  click: 'brass',
  reply: 'brass',
  bounce: 'crimson',
  unsubscribe: 'crimson',
  complaint: 'crimson',
};

export default function ProspectDrawer({
  prospectId, onClose, onMutate,
}: {
  prospectId: string | null;
  onClose: () => void;
  onMutate: () => void;
}) {
  const [data, setData] = useState<{ prospect: ProspectDetail; sends: SendEntry[]; events: EventEntry[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [suppressing, setSuppressing] = useState(false);

  useEffect(() => {
    if (!prospectId) { setData(null); return; }
    setLoading(true);
    fetch(apiPath(`/api/admin/outreach/prospects/${prospectId}`))
      .then((r) => r.json())
      .then((json) => { if (json.prospect) setData(json); })
      .finally(() => setLoading(false));
  }, [prospectId]);

  async function handleSuppress() {
    if (!data?.prospect.email) return;
    if (!confirm(`Suppress ${data.prospect.email}? They will not receive further outreach.`)) return;
    setSuppressing(true);
    try {
      const res = await fetch(apiPath('/api/admin/outreach/suppressions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.prospect.email, notes: 'Suppressed from prospect drawer' }),
      });
      if (res.ok) {
        onMutate();
        onClose();
      }
    } finally {
      setSuppressing(false);
    }
  }

  return (
    <ModalPortal>
    <AnimatePresence>
      {prospectId && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 backdrop-blur-md"
        >
          <PaperGrainDefs />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-full sm:max-w-[640px] overflow-y-auto"
            style={{
              borderLeft: '4px solid var(--color-brass)',
              boxShadow: '-30px 0 60px -20px rgba(0,0,0,0.65)',
              /* A slightly darker walnut than the page, so the drawer reads as a separate panel. */
              backgroundColor: '#13100A',
              backgroundImage:
                'radial-gradient(800px 500px at 50% 0%, rgba(180,145,74,0.10), transparent 60%)',
            }}
          >
            {/* Sticky thin ribbon */}
            <div
              className="sticky top-0 z-10 px-7 py-3 flex items-center justify-between"
              style={{
                backgroundColor: '#13100A',
                borderBottom: '2px solid var(--color-brass)',
                boxShadow: '0 6px 14px -10px rgba(0,0,0,0.30)',
              }}
            >
              <div className="brass-rule-thin absolute top-0 left-0 right-0" />
              <span className="smallcaps text-[10px] brass-text">From the File</span>
              <button
                onClick={onClose}
                className="ink-text hover:crimson-text transition-colors p-1"
                aria-label="Close"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loading || !data ? (
              <div className="px-7 py-16 text-center font-display ink-soft text-[14px]" style={{ fontStyle: 'italic' }}>
                Pulling the file from the cabinet…
              </div>
            ) : (
              <article className="px-7 lg:px-9 py-6 relative">
                {/* Postmark — top right of the article */}
                <div className="absolute right-6 top-2 hidden sm:block" style={{ transform: 'translate(8%, -10%)' }}>
                  <div className="postmark">
                    <div>{(STATUS_LABEL[data.prospect.status] ?? data.prospect.status).replace('_', ' ')}</div>
                  </div>
                </div>

                {/* Identity */}
                <header className="mb-7">
                  <Headline scale="byline" className="mb-1">
                    {data.prospect.campaign_niche ?? 'Subject'}
                    {data.prospect.campaign_location && (
                      <> · {data.prospect.campaign_location}</>
                    )}
                  </Headline>
                  <Headline scale="display" className="mb-2">{data.prospect.name}</Headline>
                  <StatusWord status={data.prospect.status} />
                </header>

                <div className="brass-rule-thin mb-5" />

                {/* Field grid */}
                <dl className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
                  <Field label="Address" value={data.prospect.email} variant="copy" />
                  <Field label="Principal" value={data.prospect.principal_name} />
                  <Field label="Website" value={data.prospect.website} variant="link" />
                  <Field label="Telephone" value={data.prospect.phone} />
                  <Field label="City" value={data.prospect.city} />
                  <Field label="Voice" value={data.prospect.draft_archetype} />
                </dl>

                {/* Actions */}
                {data.prospect.email && data.prospect.status !== 'suppressed' && (
                  <div className="flex flex-wrap items-center gap-4 mb-7">
                    <a href={`mailto:${data.prospect.email}`}>
                      <BrassButton size="sm" type="button">Open in Gmail ↗</BrassButton>
                    </a>
                    <button
                      onClick={handleSuppress}
                      disabled={suppressing}
                      className="smallcaps text-[10px] crimson-text hover:ink-text underline-offset-4 hover:underline"
                    >
                      {suppressing ? 'striking…' : '✦ strike from this paper'}
                    </button>
                  </div>
                )}

                {/* Draft message — paper-within-paper */}
                {data.prospect.draft_subject && (
                  <section className="mb-7">
                    <Headline scale="byline" className="mb-3">The Draft Letter</Headline>
                    <div
                      className="rounded-sm px-5 py-4"
                      style={{
                        backgroundColor: 'rgba(255,235,200,0.06)',
                        border: '1px solid rgba(180,145,74,0.20)',
                        borderTop: '2px solid var(--color-brass)',
                      }}
                    >
                      <div className="font-display ink-text text-[15px] mb-3" style={{ fontStyle: 'italic', fontWeight: 600 }}>
                        Re: {data.prospect.draft_subject}
                      </div>
                      <pre className="font-display ink-text text-[14px] whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'var(--font-display)' }}>
                        {data.prospect.draft_body ?? ''}
                      </pre>
                    </div>
                  </section>
                )}

                {/* Site issues — editorial numbered list */}
                {data.prospect.analysis?.issues && data.prospect.analysis.issues.length > 0 && (
                  <section className="mb-7">
                    <Headline scale="byline" className="mb-3">Editor&apos;s Margin Notes — Site Issues</Headline>
                    <ol className="space-y-5">
                      {data.prospect.analysis.issues.map((iss, idx) => (
                        <li key={idx} className="relative pl-12">
                          <span
                            className="absolute left-0 top-0 font-display tabular-nums brass-text"
                            style={{ fontWeight: 900, fontSize: '34px', lineHeight: 0.85 }}
                          >
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="font-display ink-text text-[15px] leading-snug mb-1" style={{ fontStyle: 'italic', fontWeight: 600 }}>
                            {iss.problem}
                          </div>
                          <div className="font-display ink-soft text-[13px] mb-1">
                            <span className="smallcaps text-[10px] ink-text mr-1.5">Impact —</span>
                            <span style={{ fontStyle: 'italic' }}>{iss.impact}</span>
                          </div>
                          <div className="font-display text-[13px] brass-text">
                            <span className="smallcaps text-[10px] mr-1.5" style={{ color: 'var(--color-brass-deep)' }}>Fix —</span>
                            <span style={{ fontStyle: 'italic' }}>{iss.fix}</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                <div className="brass-rule-thin mb-5" />

                {/* Timeline */}
                <section>
                  <div className="flex items-baseline justify-between gap-3 mb-4">
                    <Headline scale="byline">The Record</Headline>
                    <span className="smallcaps text-[10px] ink-soft tabular-nums">
                      {data.sends.length} {data.sends.length === 1 ? 'letter' : 'letters'} · {data.events.length} {data.events.length === 1 ? 'event' : 'events'}
                    </span>
                  </div>

                  {data.sends.length === 0 && data.events.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="brass-text text-[16px] mb-2">✦</div>
                      <p className="font-display ink-soft text-[13px]" style={{ fontStyle: 'italic' }}>
                        Awaiting their first letter. This name is queued for tonight&apos;s edition.
                      </p>
                    </div>
                  ) : (
                    <ol className="relative pl-5 space-y-5">
                      {/* Vertical brass thin line */}
                      <span
                        className="absolute left-[5px] top-2 bottom-2 w-px"
                        style={{ backgroundColor: 'rgba(180,145,74,0.40)' }}
                        aria-hidden="true"
                      />

                      {/* Sends — major events */}
                      {data.sends.map((s) => (
                        <li key={s.id} className="relative">
                          <span
                            className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: 'var(--color-brass)' }}
                            aria-hidden="true"
                          />
                          <div className="flex items-baseline justify-between gap-2 mb-0.5">
                            <span className="font-display ink-text text-[14px]" style={{ fontWeight: 600 }}>
                              {s.follow_up_number === 0 ? 'First email' : `Follow-up #${s.follow_up_number}`}
                            </span>
                            <span className="smallcaps text-[10px] ink-soft tabular-nums">
                              {new Date(s.sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="font-display ink-soft text-[12px] mb-1.5" style={{ fontStyle: 'italic' }}>
                            “{s.subject}”
                          </div>
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-display tabular-nums text-[12px]">
                            <span className={s.open_count_real > 0 ? 'brass-text' : 'ink-soft'}>{s.open_count_real} {s.open_count_real === 1 ? 'open' : 'opens'}</span>
                            <span className="brass-text">·</span>
                            <span className={s.click_count > 0 ? 'brass-text' : 'ink-soft'}>{s.click_count} {s.click_count === 1 ? 'click' : 'clicks'}</span>
                            {s.replied && (<><span className="brass-text">·</span><span className="smallcaps text-[10px] brass-text">replied</span></>)}
                            {s.bounced && (<><span className="brass-text">·</span><span className="smallcaps text-[10px] crimson-text">bounced</span></>)}
                            {s.unsubscribed && (<><span className="brass-text">·</span><span className="smallcaps text-[10px] crimson-text">unsubscribed</span></>)}
                          </div>
                        </li>
                      ))}

                      {/* Inline events */}
                      {data.events.map((e) => {
                        const tone = EVENT_TONE[e.event_type] ?? 'ink-soft';
                        const toneClass = tone === 'brass' ? 'brass-text' : tone === 'crimson' ? 'crimson-text' : 'ink-soft';
                        const isCrimson = tone === 'crimson';
                        return (
                          <li key={e.id} className="relative">
                            <span
                              className="absolute -left-[15px] top-2 w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: isCrimson ? 'var(--color-crimson)' : 'rgba(180,145,74,0.55)' }}
                              aria-hidden="true"
                            />
                            <div className="flex items-baseline justify-between gap-2">
                              <span className={`smallcaps text-[10px] ${toneClass}`}>
                                {EVENT_LABEL[e.event_type] ?? e.event_type}
                                {e.open_type && e.open_type !== 'real' && <span className="ink-soft ml-1.5">· {e.open_type.replace('_', ' ')}</span>}
                              </span>
                              <span className="smallcaps text-[10px] ink-soft tabular-nums">
                                {new Date(e.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {e.url && (
                              <div className="font-display ink-soft text-[12px] truncate mt-0.5" style={{ fontStyle: 'italic' }}>
                                → {e.url}
                              </div>
                            )}
                            {e.reply_body && (
                              <blockquote
                                className="font-display ink-text text-[13px] mt-1.5 pl-3 leading-relaxed"
                                style={{ fontStyle: 'italic', borderLeft: '2px solid var(--color-brass)' }}
                              >
                                “{e.reply_body.slice(0, 280)}”
                              </blockquote>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </section>
              </article>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
    </ModalPortal>
  );
}

function StatusWord({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'ink';
  const toneClass = tone === 'brass' ? 'brass-text' : tone === 'crimson' ? 'crimson-text' : 'ink-text';
  return (
    <span className={`smallcaps text-[11px] ${toneClass}`}>
      ✦ {STATUS_LABEL[status] ?? status.replace('_', ' ')}
    </span>
  );
}

function Field({ label, value, variant }: { label: string; value: string | null; variant?: 'copy' | 'link' }) {
  if (!value) {
    return (
      <div>
        <dt className="smallcaps text-[10px] ink-soft">{label}</dt>
        <dd className="font-display ink-soft text-[14px]" style={{ fontStyle: 'italic' }}>—</dd>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <dt className="smallcaps text-[10px] ink-soft">{label}</dt>
      <dd className="font-display ink-text text-[14px] truncate mt-0.5">
        {variant === 'link' ? (
          <a
            href={value.startsWith('http') ? value : `https://${value}`}
            target="_blank"
            rel="noreferrer"
            className="hover:brass-text transition-colors"
            style={{
              fontStyle: 'italic',
              textDecoration: 'underline',
              textDecorationColor: 'var(--color-brass)',
              textDecorationThickness: '1px',
              textUnderlineOffset: '3px',
            }}
          >
            {value}
          </a>
        ) : variant === 'copy' ? (
          <button
            onClick={() => navigator.clipboard?.writeText(value)}
            className="hover:brass-text transition-colors text-left truncate w-full"
            style={{ fontStyle: 'italic' }}
            title="Click to copy"
          >
            {value}
          </button>
        ) : (
          <span>{value}</span>
        )}
      </dd>
    </div>
  );
}
