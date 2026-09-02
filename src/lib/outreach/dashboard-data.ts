import sql from '@/lib/db';
import { getActiveInboxes, getSystemSetting, getTodayStats } from '@/lib/outreach/db';
import { getSpamSignalSummary } from '@/lib/outreach/spam-signals';

/**
 * Dashboard payload shape — shared between the API route (for live polling)
 * and the server-rendered page (for instant first paint).
 */
export interface DashboardPayload {
  stats: {
    queued: number; sent: number; delivered: number;
    opened_raw: number; opened_real: number;
    clicked: number; replied: number; bounced: number; unsubscribed: number;
  };
  inboxes: Array<{
    id: string; label: string; email: string;
    sent_today: number; daily_cap: number; remaining: number; paused: boolean;
  }>;
  domains: Array<{
    domain: string; sent_today: number; daily_cap: number;
    hard_ceiling: number; is_transactional: boolean;
  }>;
  outreachPaused: boolean;
  signals: {
    open_rate_anomalies: Array<{ inbox_id: string; inbox_label: string; open_rate_today: number; open_rate_7d: number; delta_pct: number }>;
    silent_prospects: Array<{ prospect_id: string; prospect_name: string; prospect_email: string; hours_since_send: number }>;
    inbox_reputation_warnings: Array<{ inbox_id: string; inbox_label: string; bounce_rate_7d: number; complaint_rate_7d: number; recommended_action: string }>;
    any_alerts: boolean;
  };
  totals: {
    prospects_total: number;
    prospects_contacted: number;
    prospects_new: number;
    suppressions: number;
  };
  recentSends: Array<{
    id: string; name: string; email: string; subject: string;
    sent_at: string; opens_real: number; clicks: number;
    replied: boolean; bounced: boolean;
  }>;
}

export async function getDashboardPayload(): Promise<DashboardPayload> {
  const today = new Date().toISOString().slice(0, 10);

  const [
    stats,
    inboxRows,
    domainRows,
    pausedVal,
    signals,
    suppressionsCount,
    recentSends,
    prospectsTotalArr,
    prospectsSentArr,
    prospectsNewArr,
  ] = await Promise.all([
    getTodayStats(),
    getActiveInboxes(),
    sql<Array<{ domain: string; sent_today: number; daily_cap: number; hard_ceiling: number; is_transactional: boolean; sent_today_date: string | null }>>`
      SELECT domain, sent_today, daily_cap, hard_ceiling, is_transactional, sent_today_date
      FROM outreach_domain_limits ORDER BY is_transactional DESC, domain
    `,
    getSystemSetting<boolean>('outreach_paused'),
    getSpamSignalSummary(),
    sql<Array<{ n: number }>>`SELECT COUNT(*)::int AS n FROM email_suppressions`,
    sql<DashboardPayload['recentSends']>`
      SELECT s.id, p.name, p.email, s.subject, s.sent_at,
             s.open_count_real AS opens_real, s.click_count AS clicks,
             s.replied, s.bounced
      FROM outreach_sends s
      JOIN outreach_prospects p ON p.id = s.prospect_id
      ORDER BY s.sent_at DESC
      LIMIT 8
    `,
    sql<Array<{ n: number }>>`SELECT COUNT(*)::int AS n FROM outreach_prospects`,
    sql<Array<{ n: number }>>`SELECT COUNT(DISTINCT prospect_id)::int AS n FROM outreach_sends`,
    sql<Array<{ n: number }>>`
      SELECT COUNT(*)::int AS n
      FROM outreach_prospects p
      WHERE p.status = 'new'
        AND p.email IS NOT NULL
        AND p.draft_subject IS NOT NULL
        AND p.draft_body IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM outreach_sends s WHERE s.prospect_id = p.id AND s.follow_up_number = 0)
        AND NOT EXISTS (SELECT 1 FROM outreach_send_queue q WHERE q.prospect_id = p.id AND q.follow_up_number = 0)
    `,
  ]);

  const inboxes = inboxRows.map((i) => {
    const fresh = i.sent_today_date === today;
    const sent = fresh ? i.sent_today : 0;
    return {
      id: i.id,
      label: i.label,
      email: i.email,
      sent_today: sent,
      daily_cap: i.daily_cap,
      remaining: Math.max(0, i.daily_cap - sent),
      paused: i.paused,
    };
  });

  const domains = domainRows.map((d) => ({
    domain: d.domain,
    sent_today: d.sent_today_date === today ? d.sent_today : 0,
    daily_cap: d.daily_cap,
    hard_ceiling: d.hard_ceiling,
    is_transactional: d.is_transactional,
  }));

  return {
    stats,
    inboxes,
    domains,
    outreachPaused: pausedVal === true,
    signals,
    totals: {
      prospects_total: prospectsTotalArr[0]?.n ?? 0,
      prospects_contacted: prospectsSentArr[0]?.n ?? 0,
      prospects_new: prospectsNewArr[0]?.n ?? 0,
      suppressions: suppressionsCount[0]?.n ?? 0,
    },
    recentSends,
  };
}
