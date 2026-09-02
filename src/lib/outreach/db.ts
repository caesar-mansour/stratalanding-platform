// Thin typed wrappers over postgres.js for the outreach subsystem.
// Each function is a single query — keeps call sites readable and testable.
import sql from '@/lib/db';
import type {
  OutreachInbox,
  OutreachProspect,
  OutreachSend,
  OutreachEvent,
  OutreachQueueRow,
  OutreachDomainLimit,
  EventType,
  OpenType,
  ReplyClassification,
  ReplyMatchConfidence,
} from './types';

/* ───────────── Inboxes ───────────── */

export async function getActiveInboxes(): Promise<OutreachInbox[]> {
  const rows = await sql<OutreachInbox[]>`
    SELECT * FROM outreach_inboxes WHERE active = true ORDER BY label
  `;
  return rows;
}

/**
 * All inboxes (active + inactive). Used by the dashboard so the toggle UI
 * stays accessible even when the user has flipped a desk off.
 */
export async function getAllInboxes(): Promise<OutreachInbox[]> {
  const rows = await sql<OutreachInbox[]>`
    SELECT * FROM outreach_inboxes ORDER BY label
  `;
  return rows;
}

export async function getInboxByLabel(label: string): Promise<OutreachInbox | null> {
  const [row] = await sql<OutreachInbox[]>`
    SELECT * FROM outreach_inboxes WHERE label = ${label} LIMIT 1
  `;
  return row ?? null;
}

export async function getInboxById(id: string): Promise<OutreachInbox | null> {
  const [row] = await sql<OutreachInbox[]>`
    SELECT * FROM outreach_inboxes WHERE id = ${id} LIMIT 1
  `;
  return row ?? null;
}

export async function incrementInboxSentToday(inboxId: string): Promise<void> {
  await sql`
    UPDATE outreach_inboxes
    SET sent_today = CASE
          WHEN sent_today_date IS NULL OR sent_today_date < CURRENT_DATE THEN 1
          ELSE sent_today + 1
        END,
        sent_today_date = CURRENT_DATE,
        last_sent_at = now()
    WHERE id = ${inboxId}
  `;
}

// Atomic "claim a send slot" — returns true only if the inbox is under its
// effective daily cap. Resets sent_today on day rollover. This is the
// primary safeguard against the cap-bypass race that produced the 36/35
// over-cap dispatch on 2026-04-26.
export async function tryClaimInboxSendSlot(inboxId: string, effectiveCap: number): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`
    UPDATE outreach_inboxes
    SET sent_today = CASE
          WHEN sent_today_date IS NULL OR sent_today_date < CURRENT_DATE THEN 1
          ELSE sent_today + 1
        END,
        sent_today_date = CURRENT_DATE,
        last_sent_at = now()
    WHERE id = ${inboxId}
      AND (
        sent_today_date IS NULL
        OR sent_today_date < CURRENT_DATE
        OR sent_today < ${effectiveCap}
      )
    RETURNING id
  `;
  return rows.length > 0;
}

// Roll back a previously-claimed slot. Used when a send is aborted after
// claiming (e.g. SMTP failure, dedup hit discovered late).
export async function releaseInboxSendSlot(inboxId: string): Promise<void> {
  await sql`
    UPDATE outreach_inboxes
    SET sent_today = GREATEST(0, sent_today - 1)
    WHERE id = ${inboxId} AND sent_today_date = CURRENT_DATE
  `;
}

// Pre-flight: has this user ALREADY sent to this email address (any campaign,
// any follow-up)? Prevents extractor duplicates from causing two-touch spam.
export async function hasUserSentToEmail(userId: string, email: string): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS(
      SELECT 1 FROM outreach_sends s
      JOIN outreach_prospects p ON p.id = s.prospect_id
      WHERE s.user_id = ${userId}::uuid
        AND LOWER(p.email) = LOWER(${email})
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

// Per-user global daily ceiling — independent of inbox count. Hard cap.
export async function getUserSentToday(userId: string): Promise<number> {
  const [row] = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n
    FROM outreach_sends
    WHERE user_id = ${userId}::uuid
      AND sent_at::date = CURRENT_DATE
  `;
  return row?.n ?? 0;
}

/* ───────────── Domain limits ───────────── */

export async function getDomainLimit(domain: string): Promise<OutreachDomainLimit | null> {
  const [row] = await sql<OutreachDomainLimit[]>`
    SELECT * FROM outreach_domain_limits WHERE domain = ${domain.toLowerCase()} LIMIT 1
  `;
  return row ?? null;
}

export async function incrementDomainSentToday(domain: string): Promise<void> {
  await sql`
    UPDATE outreach_domain_limits
    SET sent_today = CASE
          WHEN sent_today_date IS NULL OR sent_today_date < CURRENT_DATE THEN 1
          ELSE sent_today + 1
        END,
        sent_today_date = CURRENT_DATE
    WHERE domain = ${domain.toLowerCase()}
  `;
}

/* ───────────── Prospects ───────────── */

export async function getProspectById(id: string): Promise<OutreachProspect | null> {
  const [row] = await sql<OutreachProspect[]>`
    SELECT * FROM outreach_prospects WHERE id = ${id} LIMIT 1
  `;
  return row ?? null;
}

export async function findProspectByEmail(
  email: string,
  campaignId: string | null,
): Promise<OutreachProspect | null> {
  if (campaignId) {
    const [row] = await sql<OutreachProspect[]>`
      SELECT * FROM outreach_prospects
      WHERE LOWER(email) = LOWER(${email}) AND campaign_id = ${campaignId}
      LIMIT 1
    `;
    return row ?? null;
  }
  const [row] = await sql<OutreachProspect[]>`
    SELECT * FROM outreach_prospects
    WHERE LOWER(email) = LOWER(${email}) AND campaign_id IS NULL
    LIMIT 1
  `;
  return row ?? null;
}

export async function updateProspectStatus(
  id: string,
  status: OutreachProspect['status'],
  extra: Partial<Pick<OutreachProspect, 'last_contact_at' | 'replied_at' | 'unsubscribed_at' | 'bounced_at'>> = {},
): Promise<void> {
  await sql`
    UPDATE outreach_prospects
    SET status = ${status},
        last_contact_at = COALESCE(${extra.last_contact_at ?? null}, last_contact_at),
        replied_at = COALESCE(${extra.replied_at ?? null}, replied_at),
        unsubscribed_at = COALESCE(${extra.unsubscribed_at ?? null}, unsubscribed_at),
        bounced_at = COALESCE(${extra.bounced_at ?? null}, bounced_at),
        updated_at = now()
    WHERE id = ${id}
  `;
}

/* ───────────── Sends ───────────── */

export interface CreateSendInput {
  prospect_id: string;
  campaign_id: string | null;
  inbox_id: string;
  follow_up_number: number;
  subject: string;
  body_text: string;
  body_html: string | null;
  message_id: string;
  tracking_token?: string;
  reply_to_token?: string;
}

export async function createSend(input: CreateSendInput): Promise<OutreachSend> {
  // user_id is derived from the prospect (multi-tenant safety, NOT NULL after migration 037).
  const [row] = await sql<OutreachSend[]>`
    INSERT INTO outreach_sends (
      user_id,
      prospect_id, campaign_id, inbox_id, follow_up_number,
      subject, body_text, body_html, message_id,
      tracking_token, reply_to_token, delivered_at
    ) VALUES (
      (SELECT user_id FROM outreach_prospects WHERE id = ${input.prospect_id}),
      ${input.prospect_id}, ${input.campaign_id}, ${input.inbox_id}, ${input.follow_up_number},
      ${input.subject}, ${input.body_text}, ${input.body_html ?? null}, ${input.message_id},
      COALESCE(${input.tracking_token ?? null}::uuid, gen_random_uuid()),
      COALESCE(${input.reply_to_token ?? null}::uuid, gen_random_uuid()),
      now()
    )
    RETURNING *
  `;
  return row;
}

export async function getSendByTrackingToken(token: string): Promise<OutreachSend | null> {
  const [row] = await sql<OutreachSend[]>`
    SELECT * FROM outreach_sends WHERE tracking_token = ${token} LIMIT 1
  `;
  return row ?? null;
}

export async function getSendByMessageId(messageId: string): Promise<OutreachSend | null> {
  const [row] = await sql<OutreachSend[]>`
    SELECT * FROM outreach_sends WHERE message_id = ${messageId} LIMIT 1
  `;
  return row ?? null;
}

/* ───────────── Events ───────────── */

export interface CreateEventInput {
  send_id: string;
  event_type: EventType;
  open_type?: OpenType;
  url?: string;
  user_agent?: string;
  ip_address?: string;
  ip_hash?: string;
  country?: string;
  city?: string;
  reply_body?: string;
  reply_classification?: ReplyClassification;
  reply_match_confidence?: ReplyMatchConfidence;
  raw_headers?: Record<string, unknown>;
}

export async function createEvent(input: CreateEventInput): Promise<OutreachEvent | null> {
  const rows = await sql<OutreachEvent[]>`
    INSERT INTO outreach_events (
      user_id,
      send_id, event_type, open_type, url,
      user_agent, ip_address, ip_hash,
      country, city,
      reply_body, reply_classification, reply_match_confidence,
      raw_headers
    ) VALUES (
      (SELECT user_id FROM outreach_sends WHERE id = ${input.send_id}),
      ${input.send_id}, ${input.event_type},
      ${input.open_type ?? null}, ${input.url ?? null},
      ${input.user_agent ?? null}, ${input.ip_address ?? null}, ${input.ip_hash ?? null},
      ${input.country ?? null}, ${input.city ?? null},
      ${input.reply_body ?? null}, ${input.reply_classification ?? null}, ${input.reply_match_confidence ?? null},
      ${input.raw_headers ? sql.json(input.raw_headers as never) : null}::jsonb
    )
    ON CONFLICT DO NOTHING
    RETURNING *
  `;
  return rows[0] ?? null;
}

/* ───────────── Queue ───────────── */

export async function reapStuckClaims(timeoutMs: number): Promise<number> {
  const res = await sql`
    UPDATE outreach_send_queue
    SET status = 'pending', claimed_by = NULL, claimed_at = NULL, updated_at = now()
    WHERE status = 'sending'
      AND claimed_at < now() - (${timeoutMs / 1000}::int || ' seconds')::interval
  `;
  return res.count;
}

export async function claimNextQueueRow(workerId: string): Promise<OutreachQueueRow | null> {
  const [row] = await sql<OutreachQueueRow[]>`
    UPDATE outreach_send_queue
    SET status = 'sending',
        claimed_by = ${workerId},
        claimed_at = now(),
        attempts = attempts + 1,
        updated_at = now()
    WHERE id = (
      SELECT id FROM outreach_send_queue
      WHERE status = 'pending' AND scheduled_for <= now()
      ORDER BY priority DESC, scheduled_for ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `;
  return row ?? null;
}

export async function markQueueRowSent(id: string): Promise<void> {
  await sql`
    UPDATE outreach_send_queue
    SET status = 'sent', updated_at = now()
    WHERE id = ${id}
  `;
}

export async function markQueueRowSkipped(
  id: string,
  status: 'skipped_suppressed' | 'skipped_cap' | 'cancelled',
  reason?: string,
): Promise<void> {
  await sql`
    UPDATE outreach_send_queue
    SET status = ${status},
        last_error = ${reason ?? null},
        updated_at = now()
    WHERE id = ${id}
  `;
}

export async function markQueueRowFailed(id: string, error: string, retry: boolean, retryAt?: Date): Promise<void> {
  if (retry) {
    await sql`
      UPDATE outreach_send_queue
      SET status = 'pending',
          claimed_by = NULL, claimed_at = NULL,
          last_error = ${error},
          scheduled_for = ${retryAt ?? new Date(Date.now() + 5 * 60 * 1000)},
          updated_at = now()
      WHERE id = ${id}
    `;
  } else {
    await sql`
      UPDATE outreach_send_queue
      SET status = 'failed',
          claimed_by = NULL, claimed_at = NULL,
          last_error = ${error},
          updated_at = now()
      WHERE id = ${id}
    `;
  }
}

export interface EnqueueInput {
  prospect_id: string;
  inbox_id: string;
  campaign_id: string | null;
  follow_up_number?: number;
  scheduled_for: Date;
  priority?: number;
}

export async function enqueueSend(input: EnqueueInput): Promise<OutreachQueueRow | null> {
  // user_id is derived from the prospect (multi-tenant safety, NOT NULL after migration 037).
  const rows = await sql<OutreachQueueRow[]>`
    INSERT INTO outreach_send_queue (
      user_id,
      prospect_id, inbox_id, campaign_id, follow_up_number, scheduled_for, priority
    ) VALUES (
      (SELECT user_id FROM outreach_prospects WHERE id = ${input.prospect_id}),
      ${input.prospect_id}, ${input.inbox_id}, ${input.campaign_id},
      ${input.follow_up_number ?? 0}, ${input.scheduled_for},
      ${input.priority ?? 100}
    )
    ON CONFLICT (prospect_id, follow_up_number) DO NOTHING
    RETURNING *
  `;
  return rows[0] ?? null;
}

/* ───────────── System settings ───────────── */

export async function getSystemSetting<T = unknown>(key: string): Promise<T | null> {
  const [row] = await sql<{ value: T }[]>`
    SELECT value FROM system_settings WHERE key = ${key} LIMIT 1
  `;
  return row?.value ?? null;
}

export async function setSystemSetting(key: string, value: unknown): Promise<void> {
  await sql`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (${key}, ${sql.json(value as never)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = now()
  `;
}

/* ───────────── Build-queue lock ─────────────
 * Single-flight gate around the queue builder. Prevents the over-stuff bug
 * where a double-click or refresh+reclick spawns two parallel builds, each
 * computing remaining=cap and enqueueing 2× the daily cap. The cap is still
 * enforced atomically at SEND time, but the queue ends up bloated and the
 * dashboard misleads the user. TTL keeps a crashed builder from locking out
 * the system permanently.
 */
const BUILD_LOCK_TTL_SECONDS = 90;

export async function tryAcquireBuildLock(key = 'outreach_build_lock'): Promise<boolean> {
  const rows = await sql<{ key: string }[]>`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (${key}, to_jsonb(now()::text), now())
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
      WHERE system_settings.updated_at < now() - (${BUILD_LOCK_TTL_SECONDS} || ' seconds')::interval
    RETURNING key
  `;
  return rows.length > 0;
}

export async function releaseBuildLock(key = 'outreach_build_lock'): Promise<void> {
  await sql`DELETE FROM system_settings WHERE key = ${key}`;
}

/* ───────────── Inbox selection + scheduling ───────────── */

export interface InboxCandidate {
  inbox: OutreachInbox;
  effective_cap: number;
  sent_today_fresh: number;   // 0 if sent_today_date is stale
  remaining: number;
  last_sent_at: Date | null;
}

/**
 * Pick the best inbox to send from next.
 *
 * Strategy: active + not-paused inboxes, sorted by most-remaining-capacity-first,
 * tiebreaker = least-recently-used (so load spreads across multiple inboxes).
 * Returns null if all inboxes are at their cap for today.
 */
export async function pickInboxForSend(): Promise<InboxCandidate | null> {
  const inboxes = await getActiveInboxes();
  const today = new Date().toISOString().slice(0, 10);

  const candidates: InboxCandidate[] = [];
  for (const inbox of inboxes) {
    if (inbox.paused) continue;
    const { effectiveDailyCap } = await import('./config');
    const cap = effectiveDailyCap(inbox);
    const sent_today_fresh = inbox.sent_today_date === today ? inbox.sent_today : 0;
    const remaining = Math.max(0, cap - sent_today_fresh);
    candidates.push({
      inbox,
      effective_cap: cap,
      sent_today_fresh,
      remaining,
      last_sent_at: inbox.last_sent_at ? new Date(inbox.last_sent_at) : null,
    });
  }

  // Filter out inboxes already at cap.
  const withCapacity = candidates.filter((c) => c.remaining > 0);
  if (withCapacity.length === 0) return null;

  withCapacity.sort((a, b) => {
    if (b.remaining !== a.remaining) return b.remaining - a.remaining;
    // Tiebreaker: least-recently-used first
    const aT = a.last_sent_at?.getTime() ?? 0;
    const bT = b.last_sent_at?.getTime() ?? 0;
    return aT - bT;
  });
  return withCapacity[0];
}

/**
 * Compute when the next send from this inbox should be scheduled for.
 * Honors min_spacing_seconds + max_spacing_seconds from the inbox config.
 * If the inbox has never sent, scheduled_for is now.
 */
export async function computeNextScheduledTime(inbox: OutreachInbox): Promise<Date> {
  const { randomSpacingSeconds } = await import('./config');
  const gap = randomSpacingSeconds(inbox.min_spacing_seconds, inbox.max_spacing_seconds);
  const now = Date.now();
  const last = inbox.last_sent_at ? new Date(inbox.last_sent_at).getTime() : 0;
  const earliest = Math.max(now, last + gap * 1000);
  const candidate = new Date(earliest);

  // If the inbox has a time window, push the schedule into [start_hour, end_hour).
  const inboxAny = inbox as OutreachInbox & { start_hour?: number | null; end_hour?: number | null };
  if (inboxAny.start_hour != null || inboxAny.end_hour != null) {
    const startH = inboxAny.start_hour ?? 0;
    const endH = inboxAny.end_hour ?? 24;
    const h = candidate.getHours();
    if (h < startH) {
      candidate.setHours(startH, candidate.getMinutes(), 0, 0);
    } else if (h >= endH) {
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(startH, 0, 0, 0);
    }
  }
  return candidate;
}

export async function isOutreachPaused(): Promise<boolean> {
  const v = await getSystemSetting<boolean>('outreach_paused');
  return v === true;
}

/* ───────────── Today stats ───────────── */

export interface TodayStats {
  queued: number;
  sent: number;
  delivered: number;
  opened_raw: number;
  opened_real: number;
  clicked: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
}

export async function getTodayStats(): Promise<TodayStats> {
  const [row] = await sql<TodayStats[]>`
    WITH today_sends AS (
      SELECT * FROM outreach_sends WHERE sent_at::date = CURRENT_DATE
    ),
    today_events AS (
      SELECT e.* FROM outreach_events e
      JOIN outreach_sends s ON s.id = e.send_id
      WHERE e.created_at::date = CURRENT_DATE
    )
    SELECT
      (SELECT COUNT(*)::int FROM outreach_send_queue WHERE status='pending' AND scheduled_for::date = CURRENT_DATE) AS queued,
      (SELECT COUNT(*)::int FROM today_sends) AS sent,
      (SELECT COUNT(*)::int FROM today_events WHERE event_type='delivered') AS delivered,
      (SELECT COUNT(*)::int FROM today_events WHERE event_type='open') AS opened_raw,
      (SELECT COUNT(*)::int FROM today_events WHERE event_type='open' AND open_type='real') AS opened_real,
      (SELECT COUNT(*)::int FROM today_events WHERE event_type='click') AS clicked,
      (SELECT COUNT(*)::int FROM today_events WHERE event_type='reply') AS replied,
      (SELECT COUNT(*)::int FROM today_events WHERE event_type='bounce') AS bounced,
      (SELECT COUNT(*)::int FROM today_events WHERE event_type='unsubscribe') AS unsubscribed
  `;
  return row;
}
