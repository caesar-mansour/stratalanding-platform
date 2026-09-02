// Follow-up scheduler logic.
// Each day, pick prospects who received an initial send N days ago,
// haven't replied or unsubscribed or bounced, and queue the next follow-up.
//
// Template defaults (Caesar can override per-campaign in Slice C v2):
//   Day 3:  "bumping this to the top" — short, casual
//   Day 7:  "last try — different angle" — reframe with one fresh insight
//   Day 14: "closing the loop" — graceful exit, low-pressure final

import sql from '@/lib/db';
import type { OutreachInbox } from './types';
import { computeNextScheduledTime } from './db';
import { isSuppressed } from '@/lib/suppressions';

export const FOLLOWUP_DAYS: Record<number, number> = {
  1: 3,   // follow-up #1 goes 3 days after initial
  2: 7,   // follow-up #2 goes 7 days after initial (cumulative = day 10 from initial)
  3: 14,  // follow-up #3 goes 14 days after initial (cumulative = day 24 from initial)
};

// Default templates — overridable later.
export function defaultFollowupTemplate(opts: {
  followUpNumber: 1 | 2 | 3;
  prospectName: string;
  originalSubject: string;
}): { subject: string; body: string } {
  const firstName = opts.prospectName.split(/\s+/)[0] || 'there';
  switch (opts.followUpNumber) {
    case 1:
      return {
        subject: `Re: ${opts.originalSubject}`,
        body: `Hey ${firstName},\n\nJust bumping this one. Curious if the data I sent landed or if you want me to do a quick second pass on a different angle.\n\n— Caesar\nStrataLanding`,
      };
    case 2:
      return {
        subject: `Re: ${opts.originalSubject}`,
        body: `Hey ${firstName},\n\nOne more try from me.\n\nGoogle's own data says sites loading in >3s lose 53% of mobile traffic. For a dental practice, that's roughly half your "dentist near me" leads walking past your door every week.\n\nNot saying that's fair or easy to fix. Just saying it's measurable. Happy to show you the specific fixes, or drop off and you can come find me later.\n\n— Caesar\nStrataLanding`,
      };
    case 3:
      return {
        subject: `Re: ${opts.originalSubject}`,
        body: `Hey ${firstName},\n\nClosing the loop — won't keep pinging.\n\nIf the timing isn't right, no worries. If things change and you want a fresh pair of eyes on the site, you know where to find me.\n\nAll the best,\n\nCaesar\nStrataLanding`,
      };
  }
}

export interface FollowupPlan {
  prospect_id: string;
  campaign_id: string | null;
  inbox_id: string;
  follow_up_number: 1 | 2 | 3;
  original_subject: string;
  scheduled_for: Date;
}

/**
 * For each eligible prospect, returns the follow-up plan.
 * Eligibility: has a prior send at follow_up_number-1, the age matches FOLLOWUP_DAYS,
 * no reply/bounce/unsubscribe, not suppressed, and no existing queue/send row for this step.
 */
export async function computeDueFollowups(now: Date = new Date()): Promise<FollowupPlan[]> {
  const plans: FollowupPlan[] = [];
  for (const fnRaw of Object.keys(FOLLOWUP_DAYS)) {
    const fn = Number(fnRaw) as 1 | 2 | 3;
    const days = FOLLOWUP_DAYS[fn];
    const priorStep = fn - 1;

    // Prospects whose LATEST send is step priorStep AND the send happened exactly `days` days ago or more,
    // AND nothing is in queue for this step, AND no existing send at this step.
    const rows = await sql<Array<{
      prospect_id: string; campaign_id: string | null; inbox_id: string; subject: string; email: string;
    }>>`
      SELECT s.prospect_id, s.campaign_id, s.inbox_id, s.subject, p.email
      FROM outreach_sends s
      JOIN outreach_prospects p ON p.id = s.prospect_id
      WHERE s.follow_up_number = ${priorStep}
        AND s.sent_at <= ${new Date(now.getTime() - days * 24 * 60 * 60 * 1000)}
        AND s.replied = false
        AND s.bounced = false
        AND s.unsubscribed = false
        AND p.status NOT IN ('suppressed','replied','unsubscribed','bounced')
        AND p.email IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM outreach_sends s2 WHERE s2.prospect_id = s.prospect_id AND s2.follow_up_number = ${fn})
        AND NOT EXISTS (SELECT 1 FROM outreach_send_queue q WHERE q.prospect_id = s.prospect_id AND q.follow_up_number = ${fn})
      ORDER BY s.sent_at ASC
      LIMIT 500
    `;

    for (const r of rows) {
      if (await isSuppressed(r.email)) continue;
      // Use the same inbox as the initial send so threading headers stay consistent.
      const [inbox] = await sql<OutreachInbox[]>`SELECT * FROM outreach_inboxes WHERE id = ${r.inbox_id} LIMIT 1`;
      if (!inbox || inbox.paused || !inbox.active) continue;
      const scheduled = await computeNextScheduledTime(inbox);
      plans.push({
        prospect_id: r.prospect_id,
        campaign_id: r.campaign_id,
        inbox_id: r.inbox_id,
        follow_up_number: fn,
        original_subject: r.subject,
        scheduled_for: scheduled,
      });
    }
  }
  return plans;
}
