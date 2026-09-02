import { NextRequest } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { timingSafeCompare } from '@/lib/security/sanitize';
import sql from '@/lib/db';
import {
  getActiveInboxes,
  enqueueSend,
  isOutreachPaused,
  computeNextScheduledTime,
  tryAcquireBuildLock,
  releaseBuildLock,
} from '@/lib/outreach/db';
import { effectiveDailyCap, randomSpacingSeconds } from '@/lib/outreach/config';
import { isSuppressed } from '@/lib/suppressions';
import { checkDomainAllowance } from '@/lib/outreach/domain-limits';
import { auditMergeTags } from '@/lib/outreach/merge-tags';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Streaming version of /api/outreach/send/start. Emits NDJSON progress
 * lines so the UI can show what stage the send-queue build is in instead
 * of just spinning. One JSON object per line; client reads chunks.
 *
 * Phases the client gets, in order:
 *   { phase: "checking_caps" }
 *   { phase: "checking_domains" }
 *   { phase: "fetching_prospects", capacity }
 *   { phase: "queueing", done, total, prospect_name }    // emitted per-prospect
 *   { phase: "kicking_worker" }
 *   { phase: "done", enqueued, first_scheduled_for, last_scheduled_for, ... }
 *   { phase: "error", reason }
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  // SECURITY (audit L-cron-stream): timing-safe compare (matches the sibling non-stream route).
  const isInternalCron = !!process.env.CRON_SECRET && !!auth && timingSafeCompare(auth, `Bearer ${process.env.CRON_SECRET}`);
  if (!isInternalCron && !(await verifyAdmin())) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      };

      let lockAcquired = false;
      try {
        if (await isOutreachPaused()) {
          send({ phase: 'done', enqueued: 0, reason: 'Outreach is globally paused. Resume first.' });
          controller.close();
          return;
        }

        // Single-flight gate. Prevents double-click / refresh-reclick from
        // spawning a second parallel build that re-reads remaining=cap and
        // double-stuffs the queue. Released in the finally block.
        lockAcquired = await tryAcquireBuildLock();
        if (!lockAcquired) {
          send({
            phase: 'done',
            enqueued: 0,
            reason: 'A send is already being prepared. Wait a moment and refresh the page.',
          });
          controller.close();
          return;
        }

        send({ phase: 'checking_caps', msg: 'Reading inbox capacity…' });
        const inboxes = await getActiveInboxes();
        const today = new Date().toISOString().slice(0, 10);
        const inboxCapacity = inboxes
          .filter((i) => i.active && !i.paused)
          .map((i) => {
            const cap = effectiveDailyCap(i);
            const sentToday = i.sent_today_date === today ? i.sent_today : 0;
            return { inbox: i, cap, sentToday, remaining: Math.max(0, cap - sentToday) };
          })
          .filter((c) => c.remaining > 0);

        if (inboxCapacity.length === 0) {
          send({ phase: 'done', enqueued: 0, reason: 'All inboxes are paused or already at their daily cap.' });
          controller.close();
          return;
        }

        send({ phase: 'checking_domains', msg: 'Checking domain ceilings…' });
        const allowedInboxes: typeof inboxCapacity = [];
        for (const c of inboxCapacity) {
          const allowance = await checkDomainAllowance(c.inbox.email);
          if (allowance.allowed) allowedInboxes.push(c);
        }
        if (allowedInboxes.length === 0) {
          send({ phase: 'done', enqueued: 0, reason: 'All inboxes blocked by domain ceiling. Wait until tomorrow or raise hard_ceiling.' });
          controller.close();
          return;
        }

        const totalCapacity = allowedInboxes.reduce((a, c) => a + c.remaining, 0);

        send({ phase: 'fetching_prospects', msg: 'Pulling letter drafts…', capacity: totalCapacity });
        const prospects = await sql<Array<{
          id: string; campaign_id: string | null; email: string; name: string;
          draft_subject: string | null; draft_body: string | null; status: string;
        }>>`
          SELECT p.id, p.campaign_id, p.email, p.name, p.draft_subject, p.draft_body, p.status
          FROM outreach_prospects p
          WHERE p.status = 'new'
            AND p.email IS NOT NULL
            AND p.draft_subject IS NOT NULL
            AND p.draft_body IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM outreach_sends s WHERE s.prospect_id = p.id AND s.follow_up_number = 0)
            AND NOT EXISTS (SELECT 1 FROM outreach_send_queue q WHERE q.prospect_id = p.id AND q.follow_up_number = 0)
          ORDER BY p.created_at ASC
          LIMIT ${totalCapacity * 2}
        `;

        const counters = { enqueued: 0, skipped_no_email: 0, skipped_suppressed: 0, skipped_merge_tags: 0 };
        const inboxAssigned = new Map<string, number>();
        const inboxNextAt = new Map<string, Date>();
        let firstScheduled: Date | null = null;
        let lastScheduled: Date | null = null;

        for (const p of prospects) {
          if (counters.enqueued >= totalCapacity) break;
          if (!p.email) { counters.skipped_no_email++; continue; }

          if (await isSuppressed(p.email)) {
            await sql`UPDATE outreach_prospects SET status='suppressed', updated_at=now() WHERE id=${p.id}`;
            counters.skipped_suppressed++;
            continue;
          }

          const audit = auditMergeTags({ subject: p.draft_subject ?? '', body: p.draft_body ?? '' });
          if (!audit.ok) { counters.skipped_merge_tags++; continue; }

          const bestInbox = allowedInboxes
            .map((c) => ({ c, used: inboxAssigned.get(c.inbox.id) ?? 0 }))
            .filter(({ c, used }) => used < c.remaining)
            .sort((a, b) => b.c.remaining - b.used - (a.c.remaining - a.used))[0];
          if (!bestInbox) break;

          const priorNext = inboxNextAt.get(bestInbox.c.inbox.id);
          const baseTime = priorNext
            ? new Date(priorNext.getTime() + randomSpacingSeconds(bestInbox.c.inbox.min_spacing_seconds, bestInbox.c.inbox.max_spacing_seconds) * 1000)
            : await computeNextScheduledTime(bestInbox.c.inbox);

          const enqueued = await enqueueSend({
            prospect_id: p.id,
            inbox_id: bestInbox.c.inbox.id,
            campaign_id: p.campaign_id,
            follow_up_number: 0,
            scheduled_for: baseTime,
          });
          if (!enqueued) continue;
          await sql`UPDATE outreach_prospects SET status='queued', updated_at=now() WHERE id=${p.id}`;

          counters.enqueued++;
          inboxAssigned.set(bestInbox.c.inbox.id, (inboxAssigned.get(bestInbox.c.inbox.id) ?? 0) + 1);
          inboxNextAt.set(bestInbox.c.inbox.id, baseTime);
          if (!firstScheduled || baseTime < firstScheduled) firstScheduled = baseTime;
          if (!lastScheduled || baseTime > lastScheduled) lastScheduled = baseTime;

          send({
            phase: 'queueing',
            done: counters.enqueued,
            total: totalCapacity,
            prospect_name: p.name,
            inbox_email: bestInbox.c.inbox.email,
            scheduled_for: baseTime.toISOString(),
          });
        }

        if (counters.enqueued > 0) {
          send({ phase: 'kicking_worker', msg: 'Handing off to the worker…' });
          await sql`
            INSERT INTO system_settings (key, value, updated_at)
            VALUES ('outreach_start_now', to_jsonb(now()::text), now())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
          `;
          const base = process.env.LOCAL_WORKER_URL || 'http://localhost:3001';
          fetch(`${base}/api/cron/outreach-send`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
          }).catch(() => {});
        }

        send({
          phase: 'done',
          enqueued: counters.enqueued,
          skipped_no_email: counters.skipped_no_email,
          skipped_suppressed: counters.skipped_suppressed,
          skipped_merge_tags: counters.skipped_merge_tags,
          first_scheduled_for: firstScheduled?.toISOString() ?? null,
          last_scheduled_for: lastScheduled?.toISOString() ?? null,
          inboxes_used: allowedInboxes.map((c) => ({
            email: c.inbox.email,
            assigned: inboxAssigned.get(c.inbox.id) ?? 0,
          })),
          reason: counters.enqueued === 0
            ? 'No eligible prospects (all queued, sent, suppressed, or missing drafts).'
            : undefined,
        });
        controller.close();
      } catch (err) {
        send({ phase: 'error', reason: err instanceof Error ? err.message : 'Unknown error' });
        controller.close();
      } finally {
        if (lockAcquired) {
          try { await releaseBuildLock(); } catch { /* lock will TTL out */ }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
