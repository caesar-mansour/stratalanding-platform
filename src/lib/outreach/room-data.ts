import sql from '@/lib/db';
import { getAllInboxes, getSystemSetting, getTodayStats } from '@/lib/outreach/db';
import { getSpamSignalSummary } from '@/lib/outreach/spam-signals';

/**
 * Decision Room payload shape — shared between the API route and the
 * server-rendered page so the first paint already has data and the client
 * polls for live updates.
 */
export interface RoomPayload {
  decision_count: number;
  hot_replies: Array<{
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
  }>;
  warm_replies: Array<{
    event_id: string;
    created_at: string;
    reply_body: string | null;
    prospect_name: string;
    prospect_email: string;
    original_subject: string;
  }>;
  fuzzy_matches: Array<{
    event_id: string;
    created_at: string;
    prospect_name: string;
    prospect_email: string;
    reply_body: string | null;
    reply_classification: string | null;
  }>;
  warnings: Array<{
    id: string;
    type: 'domain_ceiling' | 'inbox_reputation' | 'open_rate_drop' | 'bounce_spike' | 'silent_cluster';
    severity: 'critical' | 'warning';
    title: string;
    body: string;
    action_label?: string;
    action_href?: string;
  }>;
  today: {
    stats: { sent: number; opened_real: number; clicked: number; replied: number; bounced: number };
    inbox_capacity: Array<{
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
    }>;
    total_remaining_capacity: number;
    ready_to_send: number;
    outreach_paused: boolean;
    can_start: boolean;
    run: {
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
      per_inbox: Array<{
        inbox_id: string;
        label: string;
        email: string;
        total: number;
        sent: number;
        pending: number;
      }>;
    };
  };
  schedule: {
    daily_run_enabled: boolean;
    daily_run_hour: number;
    daily_run_last_at: string | null;
  };
}

export async function getRoomPayload(): Promise<RoomPayload> {
  const today = new Date().toISOString().slice(0, 10);

  const [
    hotReplies,
    warmReplies,
    fuzzyMatches,
    unhandledBounces,
    todayStats,
    inboxes,
    domainLimits,
    signals,
    pausedVal,
    newProspects,
    runRowArr,
    runByInbox,
    dailyRunEnabled,
    dailyRunHour,
    dailyRunLastAt,
  ] = await Promise.all([
    sql<RoomPayload['hot_replies']>`
      SELECT
        e.id AS event_id,
        e.send_id,
        e.created_at,
        e.reply_body,
        e.reply_classification,
        e.reply_match_confidence,
        p.id AS prospect_id,
        p.name AS prospect_name,
        p.email AS prospect_email,
        s.subject AS original_subject,
        e.raw_headers->>'rationale' AS classifier_rationale,
        (e.raw_headers->>'classifier_confidence')::numeric AS classifier_confidence
      FROM outreach_events e
      JOIN outreach_sends s ON s.id = e.send_id
      JOIN outreach_prospects p ON p.id = s.prospect_id
      WHERE e.event_type = 'reply'
        AND e.reply_classification = 'hot'
        AND e.handled_at IS NULL
        AND e.created_at >= now() - INTERVAL '7 days'
      ORDER BY e.created_at DESC
      LIMIT 10
    `,

    sql<RoomPayload['warm_replies']>`
      SELECT
        e.id AS event_id,
        e.created_at,
        e.reply_body,
        p.name AS prospect_name,
        p.email AS prospect_email,
        s.subject AS original_subject
      FROM outreach_events e
      JOIN outreach_sends s ON s.id = e.send_id
      JOIN outreach_prospects p ON p.id = s.prospect_id
      WHERE e.event_type = 'reply'
        AND e.reply_classification = 'warm'
        AND e.handled_at IS NULL
        AND e.created_at >= now() - INTERVAL '7 days'
      ORDER BY e.created_at DESC
      LIMIT 10
    `,

    sql<RoomPayload['fuzzy_matches']>`
      SELECT
        e.id AS event_id,
        e.created_at,
        p.name AS prospect_name,
        p.email AS prospect_email,
        e.reply_body,
        e.reply_classification
      FROM outreach_events e
      JOIN outreach_sends s ON s.id = e.send_id
      JOIN outreach_prospects p ON p.id = s.prospect_id
      WHERE e.event_type = 'reply'
        AND e.reply_match_confidence = 'fuzzy'
        AND e.handled_at IS NULL
        AND e.created_at >= now() - INTERVAL '7 days'
      ORDER BY e.created_at DESC
      LIMIT 10
    `,

    sql<Array<{ n: number }>>`
      SELECT COUNT(*)::int AS n
      FROM outreach_events e
      WHERE e.event_type = 'bounce'
        AND e.handled_at IS NULL
        AND e.created_at >= CURRENT_DATE
    `,

    getTodayStats(),
    getAllInboxes(),

    sql<Array<{
      domain: string;
      sent_today: number;
      daily_cap: number;
      hard_ceiling: number;
      is_transactional: boolean;
      sent_today_date: string | null;
    }>>`
      SELECT domain, sent_today, daily_cap, hard_ceiling, is_transactional, sent_today_date
      FROM outreach_domain_limits
      ORDER BY is_transactional DESC, domain
    `,

    getSpamSignalSummary(),
    getSystemSetting<boolean>('outreach_paused'),

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

    sql<Array<{
      total: number;
      sent: number;
      pending: number;
      sending: number;
      failed: number;
      first_scheduled: string | null;
      last_scheduled: string | null;
      next_pending: string | null;
    }>>`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'sending')::int AS sending,
        COUNT(*) FILTER (WHERE status IN ('failed','skipped_suppressed','skipped_cap','cancelled'))::int AS failed,
        MIN(scheduled_for) AS first_scheduled,
        MAX(scheduled_for) AS last_scheduled,
        MIN(scheduled_for) FILTER (WHERE status = 'pending') AS next_pending
      FROM outreach_send_queue
      WHERE created_at >= CURRENT_DATE
    `,

    sql<RoomPayload['today']['run']['per_inbox']>`
      SELECT
        i.id AS inbox_id,
        i.label,
        i.email,
        COUNT(q.*)::int AS total,
        COUNT(q.*) FILTER (WHERE q.status='sent')::int AS sent,
        COUNT(q.*) FILTER (WHERE q.status='pending')::int AS pending
      FROM outreach_inboxes i
      LEFT JOIN outreach_send_queue q
        ON q.inbox_id = i.id
        AND q.created_at >= CURRENT_DATE
      WHERE i.active = true
      GROUP BY i.id, i.label, i.email
      ORDER BY i.label
    `,

    getSystemSetting<boolean>('daily_run_enabled'),
    getSystemSetting<number>('daily_run_hour'),
    getSystemSetting<string | null>('daily_run_last_at'),
  ]);

  const [runRow] = runRowArr;
  const todayRun: RoomPayload['today']['run'] = {
    total: runRow.total,
    sent: runRow.sent,
    pending: runRow.pending,
    sending: runRow.sending,
    failed: runRow.failed,
    first_scheduled: runRow.first_scheduled,
    last_scheduled: runRow.last_scheduled,
    next_pending: runRow.next_pending,
    in_progress: runRow.pending > 0 || runRow.sending > 0,
    done: runRow.total > 0 && runRow.pending === 0 && runRow.sending === 0,
    per_inbox: runByInbox,
  };

  const warnings: RoomPayload['warnings'] = [];

  for (const d of domainLimits) {
    const fresh = d.sent_today_date === today;
    const sent = fresh ? d.sent_today : 0;
    if (d.is_transactional && sent >= d.daily_cap * 0.8) {
      const severe = sent >= d.hard_ceiling;
      warnings.push({
        id: `domain:${d.domain}`,
        type: 'domain_ceiling',
        severity: severe ? 'critical' : 'warning',
        title: severe ? `Domain at hard ceiling: ${d.domain}` : `Domain near cap: ${d.domain}`,
        body: `${sent}/${d.daily_cap} (ceiling ${d.hard_ceiling}). Transactional domain — stop cold sends from here ASAP.`,
        action_label: 'Settings',
        action_href: '/outreach/settings',
      });
    }
  }

  for (const w of signals.inbox_reputation_warnings) {
    warnings.push({
      id: `inbox:${w.inbox_id}`,
      type: 'inbox_reputation',
      severity: w.recommended_action === 'pause' ? 'critical' : 'warning',
      title: `Inbox reputation: ${w.inbox_label}`,
      body: `Bounce ${(w.bounce_rate_7d * 100).toFixed(2)}% · complaint ${(w.complaint_rate_7d * 100).toFixed(2)}% (last 7d). ${w.recommended_action === 'pause' ? 'Recommend pausing this inbox.' : 'Watch closely.'}`,
      action_label: 'Settings',
      action_href: '/outreach/settings',
    });
  }

  for (const a of signals.open_rate_anomalies) {
    warnings.push({
      id: `openrate:${a.inbox_id}`,
      type: 'open_rate_drop',
      severity: 'warning',
      title: `Open rate dropped: ${a.inbox_label}`,
      body: `Today ${(a.open_rate_today * 100).toFixed(1)}% vs 7-day avg ${(a.open_rate_7d * 100).toFixed(1)}% (Δ ${a.delta_pct.toFixed(0)}%). Possible spam placement.`,
    });
  }

  if (signals.silent_prospects.length > 0) {
    warnings.push({
      id: 'silent-cluster',
      type: 'silent_cluster',
      severity: 'warning',
      title: `${signals.silent_prospects.length} prospects silent 48h+`,
      body: 'Zero real opens after 48h from an inbox averaging ≥30% open rate. Statistical signal of possible filtering.',
      action_label: 'Priority view',
      action_href: '/outreach/prospects?status=sent',
    });
  }

  if (unhandledBounces[0].n > 0) {
    warnings.push({
      id: 'bounces-today',
      type: 'bounce_spike',
      severity: unhandledBounces[0].n >= 5 ? 'critical' : 'warning',
      title: `${unhandledBounces[0].n} bounce${unhandledBounces[0].n === 1 ? '' : 's'} today`,
      body: 'Unhandled bounces may indicate list quality or inbox reputation issues.',
    });
  }

  const inboxAny = inboxes as Array<typeof inboxes[number] & {
    id: string;
    active: boolean;
    start_hour: number | null;
    end_hour: number | null;
    min_spacing_seconds: number;
    max_spacing_seconds: number;
  }>;
  const inboxCapacity = inboxAny.map((i) => {
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
      active: i.active !== false,
      start_hour: i.start_hour ?? null,
      end_hour: i.end_hour ?? null,
      min_spacing_seconds: i.min_spacing_seconds,
      max_spacing_seconds: i.max_spacing_seconds,
    };
  });

  const totalRemaining = inboxCapacity.reduce((a, c) => a + (c.active ? c.remaining : 0), 0);
  const canStart = !pausedVal && totalRemaining > 0 && newProspects[0].n > 0;
  const decisionCount = hotReplies.length + fuzzyMatches.length + warnings.filter((w) => w.severity === 'critical').length;

  return {
    decision_count: decisionCount,
    hot_replies: hotReplies,
    warm_replies: warmReplies,
    fuzzy_matches: fuzzyMatches,
    warnings,
    today: {
      stats: todayStats,
      inbox_capacity: inboxCapacity,
      total_remaining_capacity: totalRemaining,
      ready_to_send: newProspects[0].n,
      outreach_paused: pausedVal === true,
      can_start: canStart && !todayRun.in_progress,
      run: todayRun,
    },
    schedule: {
      daily_run_enabled: dailyRunEnabled === true,
      daily_run_hour: typeof dailyRunHour === 'number' ? dailyRunHour : 9,
      daily_run_last_at: dailyRunLastAt ?? null,
    },
  };
}
