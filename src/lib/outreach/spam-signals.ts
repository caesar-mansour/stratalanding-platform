// Spam-placement inference — we can't directly see if an email hit spam, but
// we can watch proxy signals and surface alerts when they trend badly.
//
// Four signal families:
//   1. Open-rate anomaly: today's open rate dropped >=50% vs 7-day baseline
//   2. Silent-prospect inference: sent >48h ago + 0 opens + baseline >=30% = likely filtered
//   3. Bounce-rate breach: 7-day bounce rate >= 5%
//   4. Complaint-rate breach: 7-day complaint rate >= 0.1%
//
// These never tell us with certainty "this specific email hit spam." They tell us
// "something changed; investigate." For per-email certainty, use seed-inbox tests
// or Google Postmaster Tools (external).

import sql from '@/lib/db';
import { INBOX_BOUNCE_RATE_PAUSE, INBOX_COMPLAINT_RATE_PAUSE } from './config';

export interface OpenRateSignal {
  inbox_id: string;
  inbox_label: string;
  sends_today: number;
  open_rate_today: number;         // 0-1
  sends_7d: number;
  open_rate_7d: number;            // 0-1
  delta_pct: number;               // negative = dropping
  alert: boolean;                  // true when delta < -50% and sends_today >= 10
}

/**
 * Compute today's real-open rate vs the 7-day baseline for each inbox.
 * Signal fires when open rate drops >=50% of baseline AND today has >=10 sends
 * (to avoid false positives from small-sample noise).
 */
export async function detectOpenRateAnomalies(): Promise<OpenRateSignal[]> {
  const rows = await sql<Array<{
    inbox_id: string;
    inbox_label: string;
    sends_today: number;
    opens_today: number;
    sends_7d: number;
    opens_7d: number;
  }>>`
    WITH windows AS (
      SELECT
        s.inbox_id,
        i.label AS inbox_label,
        COUNT(*) FILTER (WHERE s.sent_at::date = CURRENT_DATE)::int AS sends_today,
        COUNT(*) FILTER (WHERE s.sent_at::date BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE - INTERVAL '1 day')::int AS sends_7d
      FROM outreach_sends s
      JOIN outreach_inboxes i ON i.id = s.inbox_id
      WHERE s.sent_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY s.inbox_id, i.label
    ),
    opens AS (
      SELECT
        s.inbox_id,
        COUNT(DISTINCT s.id) FILTER (
          WHERE e.event_type='open' AND e.open_type='real' AND e.created_at::date = CURRENT_DATE
        )::int AS opens_today,
        COUNT(DISTINCT s.id) FILTER (
          WHERE e.event_type='open' AND e.open_type='real'
            AND e.created_at::date BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE - INTERVAL '1 day'
        )::int AS opens_7d
      FROM outreach_sends s
      LEFT JOIN outreach_events e ON e.send_id = s.id
      WHERE s.sent_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY s.inbox_id
    )
    SELECT w.inbox_id, w.inbox_label, w.sends_today, w.sends_7d,
           COALESCE(o.opens_today, 0) AS opens_today,
           COALESCE(o.opens_7d, 0) AS opens_7d
    FROM windows w LEFT JOIN opens o ON o.inbox_id = w.inbox_id
  `;

  return rows.map((r) => {
    const open_rate_today = r.sends_today > 0 ? r.opens_today / r.sends_today : 0;
    const open_rate_7d = r.sends_7d > 0 ? r.opens_7d / r.sends_7d : 0;
    const delta_pct = open_rate_7d > 0 ? ((open_rate_today - open_rate_7d) / open_rate_7d) * 100 : 0;
    const alert = r.sends_today >= 10 && open_rate_7d > 0 && delta_pct <= -50;
    return {
      inbox_id: r.inbox_id,
      inbox_label: r.inbox_label,
      sends_today: r.sends_today,
      open_rate_today: Math.round(open_rate_today * 10_000) / 10_000,
      sends_7d: r.sends_7d,
      open_rate_7d: Math.round(open_rate_7d * 10_000) / 10_000,
      delta_pct: Math.round(delta_pct * 10) / 10,
      alert,
    };
  });
}

export interface SilentProspectFlag {
  prospect_id: string;
  prospect_email: string;
  prospect_name: string;
  send_id: string;
  sent_at: string;
  hours_since_send: number;
  likely_filtered: boolean;
}

/**
 * Find prospects sent >=48 hours ago with 0 real opens, where the sending
 * inbox has a historical open rate >=30%. These are statistically likely
 * to have been filtered to spam.
 */
export async function detectSilentProspects(): Promise<SilentProspectFlag[]> {
  const rows = await sql<Array<{
    prospect_id: string;
    prospect_email: string;
    prospect_name: string;
    send_id: string;
    sent_at: string;
    inbox_open_rate: number;
  }>>`
    WITH inbox_rates AS (
      SELECT s.inbox_id,
             (COUNT(DISTINCT s.id) FILTER (
                WHERE EXISTS (
                  SELECT 1 FROM outreach_events e
                  WHERE e.send_id = s.id AND e.event_type='open' AND e.open_type='real'
                )
              ))::float / NULLIF(COUNT(*), 0) AS rate
      FROM outreach_sends s
      WHERE s.sent_at >= CURRENT_DATE - INTERVAL '14 days'
      GROUP BY s.inbox_id
    ),
    silent AS (
      SELECT s.id AS send_id,
             s.prospect_id,
             p.email AS prospect_email,
             p.name AS prospect_name,
             s.sent_at,
             s.inbox_id
      FROM outreach_sends s
      JOIN outreach_prospects p ON p.id = s.prospect_id
      WHERE s.sent_at <= now() - INTERVAL '48 hours'
        AND s.sent_at >= CURRENT_DATE - INTERVAL '14 days'
        AND NOT EXISTS (
          SELECT 1 FROM outreach_events e
          WHERE e.send_id = s.id AND e.event_type='open' AND e.open_type='real'
        )
    )
    SELECT s.*, COALESCE(ir.rate, 0) AS inbox_open_rate
    FROM silent s LEFT JOIN inbox_rates ir ON ir.inbox_id = s.inbox_id
    WHERE COALESCE(ir.rate, 0) >= 0.30
    ORDER BY s.sent_at DESC
    LIMIT 200
  `;

  return rows.map((r) => {
    const hours = Math.round((Date.now() - new Date(r.sent_at).getTime()) / 3_600_000);
    return {
      prospect_id: r.prospect_id,
      prospect_email: r.prospect_email,
      prospect_name: r.prospect_name,
      send_id: r.send_id,
      sent_at: r.sent_at,
      hours_since_send: hours,
      likely_filtered: r.inbox_open_rate >= 0.30 && hours >= 48,
    };
  });
}

export interface InboxReputationSignal {
  inbox_id: string;
  inbox_label: string;
  sends_7d: number;
  bounce_rate_7d: number;
  complaint_rate_7d: number;
  bounce_alert: boolean;
  complaint_alert: boolean;
  recommended_action: 'ok' | 'monitor' | 'pause';
}

/**
 * Rolling 7-day bounce + complaint rate per inbox. If either exceeds thresholds,
 * the inbox should be auto-paused (worker respects `paused=true`).
 */
export async function computeInboxReputation(): Promise<InboxReputationSignal[]> {
  const rows = await sql<Array<{
    inbox_id: string;
    inbox_label: string;
    sends_7d: number;
    bounces_7d: number;
    complaints_7d: number;
  }>>`
    SELECT
      i.id AS inbox_id,
      i.label AS inbox_label,
      COUNT(s.id)::int AS sends_7d,
      COUNT(DISTINCT s.id) FILTER (
        WHERE EXISTS (SELECT 1 FROM outreach_events e WHERE e.send_id=s.id AND e.event_type='bounce')
      )::int AS bounces_7d,
      COUNT(DISTINCT s.id) FILTER (
        WHERE EXISTS (SELECT 1 FROM outreach_events e WHERE e.send_id=s.id AND e.event_type='complaint')
      )::int AS complaints_7d
    FROM outreach_inboxes i
    LEFT JOIN outreach_sends s ON s.inbox_id = i.id AND s.sent_at >= CURRENT_DATE - INTERVAL '7 days'
    WHERE i.active = true
    GROUP BY i.id, i.label
  `;

  return rows.map((r) => {
    const bounce_rate = r.sends_7d > 0 ? r.bounces_7d / r.sends_7d : 0;
    const complaint_rate = r.sends_7d > 0 ? r.complaints_7d / r.sends_7d : 0;
    const bounce_alert = bounce_rate >= INBOX_BOUNCE_RATE_PAUSE;
    const complaint_alert = complaint_rate >= INBOX_COMPLAINT_RATE_PAUSE;
    const recommended_action: 'ok' | 'monitor' | 'pause' =
      bounce_alert || complaint_alert ? 'pause' :
      bounce_rate >= 0.025 || complaint_rate >= 0.0005 ? 'monitor' : 'ok';
    return {
      inbox_id: r.inbox_id,
      inbox_label: r.inbox_label,
      sends_7d: r.sends_7d,
      bounce_rate_7d: Math.round(bounce_rate * 10_000) / 10_000,
      complaint_rate_7d: Math.round(complaint_rate * 10_000) / 10_000,
      bounce_alert,
      complaint_alert,
      recommended_action,
    };
  });
}

/** Aggregate signal bundle for the Priority tab. */
export interface SpamSignalSummary {
  open_rate_anomalies: OpenRateSignal[];      // only ones with alert=true included
  silent_prospects: SilentProspectFlag[];      // only likely_filtered=true
  inbox_reputation_warnings: InboxReputationSignal[]; // recommended_action != 'ok'
  any_alerts: boolean;
}

export async function getSpamSignalSummary(): Promise<SpamSignalSummary> {
  const [openRates, silent, reputation] = await Promise.all([
    detectOpenRateAnomalies(),
    detectSilentProspects(),
    computeInboxReputation(),
  ]);
  const open_rate_anomalies = openRates.filter((s) => s.alert);
  const silent_prospects = silent.filter((s) => s.likely_filtered);
  const inbox_reputation_warnings = reputation.filter((s) => s.recommended_action !== 'ok');
  return {
    open_rate_anomalies,
    silent_prospects,
    inbox_reputation_warnings,
    any_alerts: open_rate_anomalies.length > 0 || silent_prospects.length > 0 || inbox_reputation_warnings.length > 0,
  };
}
