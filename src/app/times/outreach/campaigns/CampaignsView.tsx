'use client';

import { motion } from 'framer-motion';
import { PaperGrainDefs } from '../../_components/PaperGrainDefs';
import { PaperCard } from '../../_components/PaperCard';
import { Colophon } from '../../_components/Colophon';
import { SectionMasthead } from '../../_components/SectionMasthead';
import { Headline } from '../../_components/Headline';
import { AnimatedNumber } from '../../_components/AnimatedNumber';

export interface CampaignRow {
  id: string;
  location: string;
  niche: string;
  platform: string;
  status: 'extracted' | 'sending' | 'sent' | 'follow_up' | 'completed';
  notes: string | null;
  extracted_at: string;
  created_at: string;
  updated_at: string;
  first_sent_at: string | null;
  leads: number;
  sends: number;
  opens_real: number;
  replies: number;
  bounces: number;
}

const STATUS_LABEL: Record<CampaignRow['status'], string> = {
  extracted: 'ready',
  sending: 'sending',
  sent: 'sent',
  follow_up: 'follow-up',
  completed: 'completed',
};

export default function CampaignsView({ campaigns }: { campaigns: CampaignRow[] }) {
  return (
    <div className="relative">
      <PaperGrainDefs />
      <PaperCard padding="lg" as="article" className="md:px-10 lg:px-14 lg:py-10">
        <SectionMasthead
          kicker="Targeting"
          title="Campaigns"
          description="Each campaign groups prospects by city and niche. Counters are live — pulled from real sends and replies."
          action={
            <span className="smallcaps text-[11px] ink-soft tabular-nums">
              <span className="ink-text font-semibold">{campaigns.length}</span> {campaigns.length === 1 ? 'campaign' : 'campaigns'}
            </span>
          }
        />

        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <div className="brass-text text-[18px] mb-2">✦</div>
            <Headline scale="section" italic className="mb-1">No campaigns yet.</Headline>
            <p className="font-display ink-soft text-[12px]" style={{ fontStyle: 'italic' }}>
              Campaigns are created when you import prospects. See scripts/outreach-import.js.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {campaigns.map((c, i) => {
              const replyRate = c.sends > 0 ? ((c.replies / c.sends) * 100).toFixed(1) : '0.0';
              const openRate = c.sends > 0 ? ((c.opens_real / c.sends) * 100).toFixed(1) : '0.0';
              return (
                <motion.article
                  key={c.id}
                  initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.15 + i * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ x: 3 }}
                  className="relative pt-5"
                >
                  <motion.div
                    className="brass-rule-thin absolute top-0 left-0 right-0 origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.2 + i * 0.07, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0 flex-1">
                      <Headline scale="byline" className="mb-1">
                        {c.platform} · {STATUS_LABEL[c.status]}
                      </Headline>
                      <h3 className="font-display ink-text leading-tight" style={{ fontWeight: 900, fontSize: '24px' }}>
                        {c.niche} of <span style={{ fontStyle: 'italic', fontWeight: 400 }}>{c.location}</span>
                      </h3>
                      {c.notes && (
                        <p className="font-display ink-soft text-[13px] mt-1 line-clamp-2" style={{ fontStyle: 'italic' }}>
                          {c.notes}
                        </p>
                      )}
                      <div className="smallcaps text-[10px] ink-soft mt-2 tabular-nums">
                        Filed {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {c.first_sent_at && (
                          <>  ·  First letter {new Date(c.first_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metrics — typeset row, no boxes */}
                  <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 font-display tabular-nums">
                    <Metric label="Leads" value={c.leads} />
                    <span className="brass-text">·</span>
                    <Metric label="Letters sent" value={c.sends} />
                    <span className="brass-text">·</span>
                    <Metric label="Opens" value={c.opens_real} sub={`${openRate}%`} />
                    <span className="brass-text">·</span>
                    <Metric label="Replies" value={c.replies} sub={`${replyRate}%`} accent="brass" />
                    <span className="brass-text">·</span>
                    <Metric label="Bounces" value={c.bounces} accent={c.bounces > 0 ? 'crimson' : undefined} />
                    <span className="brass-text">·</span>
                    <Metric label="Remaining" value={Math.max(0, c.leads - c.sends)} />
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        <Colophon />
      </PaperCard>
    </div>
  );
}

function Metric({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: 'brass' | 'crimson' }) {
  const colorClass = accent === 'brass' ? 'brass-text' : accent === 'crimson' ? 'crimson-text' : 'ink-text';
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="smallcaps text-[10px] ink-soft">{label}</span>
      <AnimatedNumber
        value={value}
        className={`text-[20px] font-semibold ${colorClass}`}
      />
      {sub && <span className="font-display ink-soft text-[11px]" style={{ fontStyle: 'italic' }}>{sub}</span>}
    </span>
  );
}
