import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { timingSafeCompare } from '@/lib/security/sanitize';
import sql from '@/lib/db';
import {
  claimNextQueueRow,
  reapStuckClaims,
  markQueueRowSent,
  markQueueRowSkipped,
  markQueueRowFailed,
  getInboxById,
  getProspectById,
  createSend,
  isOutreachPaused,
  incrementDomainSentToday,
  tryClaimInboxSendSlot,
  releaseInboxSendSlot,
  hasUserSentToEmail,
  getUserSentToday,
} from '@/lib/outreach/db';
import { buildEmail } from '@/lib/outreach/build-email';
import { sendOutreachEmail } from '@/lib/outreach/send-adapter';
import { isSuppressed } from '@/lib/suppressions';
import { checkDomainAllowance } from '@/lib/outreach/domain-limits';
import { auditMergeTags } from '@/lib/outreach/merge-tags';
import {
  effectiveDailyCap,
  WORKER_CLAIM_TIMEOUT_MS,
  WORKER_BATCH_LIMIT,
  MAX_SEND_ATTEMPTS,
  USER_DAILY_HARD_CAP,
} from '@/lib/outreach/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Keep below Netlify's 10s scheduled-function ceiling.
export const maxDuration = 10;

// Bearer-token guard so only the cron scheduler + authorized admin endpoints can invoke us.
function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  if (!process.env.CRON_SECRET) return false;
  return timingSafeCompare(auth ?? '', expected);
}

export async function GET(request: NextRequest) { return handle(request); }
export async function POST(request: NextRequest) { return handle(request); }

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerId = `worker-${crypto.randomBytes(6).toString('hex')}`;
  const summary = { claimed: 0, sent: 0, skipped_suppressed: 0, skipped_cap: 0, failed: 0, errors: [] as string[] };

  if (await isOutreachPaused()) {
    return NextResponse.json({ ok: true, paused: true, summary });
  }

  await reapStuckClaims(WORKER_CLAIM_TIMEOUT_MS);

  // Process up to WORKER_BATCH_LIMIT queue rows. Each is claimed atomically via
  // FOR UPDATE SKIP LOCKED in claimNextQueueRow().
  for (let i = 0; i < WORKER_BATCH_LIMIT; i++) {
    const row = await claimNextQueueRow(workerId);
    if (!row) break;
    summary.claimed++;

    try {
      const [inbox, prospect] = await Promise.all([
        getInboxById(row.inbox_id),
        getProspectById(row.prospect_id),
      ]);

      if (!inbox || !prospect || !prospect.email) {
        await markQueueRowFailed(row.id, 'missing inbox or prospect email', false);
        summary.failed++;
        continue;
      }

      // 1) Suppression check
      if (await isSuppressed(prospect.email)) {
        await markQueueRowSkipped(row.id, 'skipped_suppressed', 'Prospect in suppression list');
        await sql`UPDATE outreach_prospects SET status='suppressed', updated_at=now() WHERE id=${prospect.id}`;
        summary.skipped_suppressed++;
        continue;
      }

      // 2) Inbox cap (preflight only — atomic claim happens in step 4b
      // immediately before SMTP, which is the actual race-safe gate)
      const today = new Date().toISOString().slice(0, 10);
      const inboxSentToday = inbox.sent_today_date === today ? inbox.sent_today : 0;
      const cap = effectiveDailyCap(inbox);
      if (inbox.paused) {
        await markQueueRowFailed(row.id, 'inbox paused', true, new Date(Date.now() + 30 * 60 * 1000));
        summary.skipped_cap++;
        continue;
      }
      if (inboxSentToday >= cap) {
        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        await markQueueRowFailed(row.id, `inbox at cap (${inboxSentToday}/${cap})`, true, tomorrow);
        summary.skipped_cap++;
        continue;
      }

      // 2b) Per-user daily hard ceiling — independent of how many inboxes
      // exist. Catches the case where multiple inboxes' caps would otherwise
      // sum to a dangerous total.
      const userSentToday = await getUserSentToday(prospect.user_id);
      if (userSentToday >= USER_DAILY_HARD_CAP) {
        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        await markQueueRowFailed(
          row.id,
          `user at daily hard cap (${userSentToday}/${USER_DAILY_HARD_CAP})`,
          true,
          tomorrow,
        );
        summary.skipped_cap++;
        continue;
      }

      // 2c) Email-level dedup — belt-and-suspenders against extractor duplicates producing two
      // FIRST touches to the same address.
      //
      // AUDIT 2026-08-12 (P1 E-04): this used to run for EVERY queued row. hasUserSentToEmail()
      // is true as soon as any send exists for that address, so the initial touch went out and
      // then every follow-up (steps 2-5) was cancelled as "already sent to this email" — the
      // entire follow-up cadence was dead, and the prospect was marked 'sent' so it never
      // retried. Scope it to the first touch only; follow-ups are supposed to reach an address
      // that has already been emailed, that is what a follow-up IS.
      const isFirstTouch = !row.follow_up_number || Number(row.follow_up_number) <= 1;
      if (isFirstTouch && (await hasUserSentToEmail(prospect.user_id, prospect.email))) {
        await markQueueRowSkipped(row.id, 'cancelled', 'already sent to this email');
        await sql`UPDATE outreach_prospects SET status='sent', updated_at=now() WHERE id=${prospect.id}`;
        summary.skipped_suppressed++;
        continue;
      }

      // 3) Domain ceiling
      const allowance = await checkDomainAllowance(inbox.email);
      if (!allowance.allowed) {
        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        await markQueueRowFailed(row.id, `domain over ceiling: ${allowance.domain}`, true, tomorrow);
        summary.skipped_cap++;
        continue;
      }

      // 3b) Per-inbox time window. If "now" is outside [start_hour, end_hour),
      // reschedule for the next eligible boundary so we don't send at 3am from a 9-18 inbox.
      const inboxAny = inbox as { start_hour?: number | null; end_hour?: number | null };
      if (inboxAny.start_hour != null || inboxAny.end_hour != null) {
        const now = new Date();
        const hour = now.getHours();
        const startH = inboxAny.start_hour ?? 0;
        const endH = inboxAny.end_hour ?? 24;
        if (hour < startH || hour >= endH) {
          const next = new Date(now);
          if (hour < startH) {
            next.setHours(startH, 0, 0, 0);
          } else {
            next.setDate(next.getDate() + 1);
            next.setHours(startH, 0, 0, 0);
          }
          await markQueueRowFailed(row.id, `outside inbox window ${startH}-${endH}`, true, next);
          summary.skipped_cap++;
          continue;
        }
      }

      // 4) Merge-tag audit
      const subject = prospect.draft_subject ?? '';
      const body = prospect.draft_body ?? '';
      const audit = auditMergeTags({ subject, body });
      if (!audit.ok) {
        await markQueueRowFailed(row.id, `unfilled merge tags: ${audit.offenders.join(', ')}`, false);
        summary.failed++;
        continue;
      }
      if (!subject || !body) {
        await markQueueRowFailed(row.id, 'prospect has no draft_subject/body', false);
        summary.failed++;
        continue;
      }

      // 5) Atomically claim the inbox cap slot. Race-safe — if another worker
      // already pushed sent_today to cap, this returns false and we requeue.
      const claimed = await tryClaimInboxSendSlot(inbox.id, cap);
      if (!claimed) {
        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        await markQueueRowFailed(row.id, `inbox at cap (atomic claim failed)`, true, tomorrow);
        summary.skipped_cap++;
        continue;
      }

      // 6) Build + send
      const built = buildEmail({
        toEmail: prospect.email,
        toName: prospect.name,
        fromEmail: inbox.email,
        fromDisplay: inbox.display_name,
        subject,
        bodyText: body,
        trackingToken: crypto.randomUUID(),
        replyToToken: crypto.randomUUID(),
        followUpNumber: row.follow_up_number,
      });

      const result = await sendOutreachEmail(built, inbox);
      if (!result.ok) {
        // Roll back the cap slot we just claimed — the email never went out.
        await releaseInboxSendSlot(inbox.id);
        const retryable = Boolean(result.retryable) && row.attempts < MAX_SEND_ATTEMPTS;
        await markQueueRowFailed(row.id, result.error ?? 'send failed', retryable);
        summary.failed++;
        summary.errors.push(`${prospect.email}: ${result.error}`);
        continue;
      }

      // 6) Persist send + update state
      await createSend({
        prospect_id: prospect.id,
        campaign_id: row.campaign_id,
        inbox_id: inbox.id,
        follow_up_number: row.follow_up_number,
        subject,
        body_text: body,
        body_html: built.bodyHtml,
        message_id: built.messageId,
        tracking_token: extractTokenFromBuiltUrl(built.bodyHtml) ?? undefined,
        reply_to_token: extractReplyToToken(built.replyTo) ?? undefined,
      });
      await sql`
        INSERT INTO outreach_events (user_id, send_id, event_type)
        SELECT user_id, id, 'delivered' FROM outreach_sends WHERE message_id = ${built.messageId} LIMIT 1
      `;
      await sql`
        UPDATE outreach_prospects
        SET status = CASE WHEN status IN ('new','queued') THEN 'sent' ELSE status END,
            last_contact_at = now(),
            updated_at = now()
        WHERE id = ${prospect.id}
      `;
      // sent_today already incremented atomically by tryClaimInboxSendSlot.
      await incrementDomainSentToday(allowance.domain);
      await markQueueRowSent(row.id);
      summary.sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      await markQueueRowFailed(row.id, msg, true);
      summary.failed++;
      summary.errors.push(msg);
    }
  }

  return NextResponse.json({ ok: true, workerId, summary });
}

// Extract the tracking token we embedded in the HTML pixel URL.
function extractTokenFromBuiltUrl(html: string): string | null {
  const m = html.match(/\/track\/open\/([0-9a-f-]{36})\.(?:png|gif)/i);
  return m ? m[1] : null;
}
function extractReplyToToken(replyTo: string): string | null {
  const m = replyTo.match(/\+([0-9a-f-]{36})@/i);
  return m ? m[1] : null;
}
