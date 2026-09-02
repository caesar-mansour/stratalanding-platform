import { NextRequest, NextResponse } from 'next/server';
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

interface StartResponse {
  ok: boolean;
  dry_run: boolean;
  would_enqueue: number;          // always the planned count (same as `enqueued` when actually run)
  enqueued: number;                // 0 in dry_run, actual when executed
  skipped_no_email: number;
  skipped_suppressed: number;
  skipped_merge_tags: number;
  first_scheduled_for: string | null;
  last_scheduled_for: string | null;
  inboxes_used: Array<{ email: string; assigned: number; remaining_capacity: number }>;
  reason?: string;
}

export async function POST(request: NextRequest) {
  // Accept either an admin cookie OR the CRON_SECRET bearer (used by the daily auto-trigger).
  const auth = request.headers.get('authorization');
  const isInternalCron = !!process.env.CRON_SECRET && timingSafeCompare(auth ?? '', `Bearer ${process.env.CRON_SECRET}`);
  if (!isInternalCron && !(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let dryRun = false;
  try {
    const body = await request.json().catch(() => ({}));
    dryRun = body?.dry_run === true;
  } catch { /* body may be empty */ }

  if (await isOutreachPaused() && !dryRun) {
    return NextResponse.json<StartResponse>({
      ok: true, dry_run: dryRun, would_enqueue: 0, enqueued: 0, skipped_no_email: 0, skipped_suppressed: 0, skipped_merge_tags: 0,
      first_scheduled_for: null, last_scheduled_for: null, inboxes_used: [],
      reason: 'Outreach is globally paused. Resume first.',
    });
  }

  // Single-flight gate around the real build. Dry-runs are read-only so they
  // don't need the lock. See stream/route.ts for the matching guard.
  let lockAcquired = false;
  if (!dryRun) {
    lockAcquired = await tryAcquireBuildLock();
    if (!lockAcquired) {
      return NextResponse.json<StartResponse>({
        ok: true, dry_run: dryRun, would_enqueue: 0, enqueued: 0, skipped_no_email: 0, skipped_suppressed: 0, skipped_merge_tags: 0,
        first_scheduled_for: null, last_scheduled_for: null, inboxes_used: [],
        reason: 'A send is already being prepared. Wait a moment and refresh the page.',
      });
    }
  }

  try {

  const inboxes = await getActiveInboxes();
  const today = new Date().toISOString().slice(0, 10);

  // Compute effective remaining capacity per inbox.
  const inboxCapacity = inboxes
    .filter((i) => i.active && !i.paused)
    .map((i) => {
      const cap = effectiveDailyCap(i);
      const sentToday = i.sent_today_date === today ? i.sent_today : 0;
      const remaining = Math.max(0, cap - sentToday);
      return { inbox: i, cap, sentToday, remaining };
    })
    .filter((c) => c.remaining > 0);

  if (inboxCapacity.length === 0) {
    return NextResponse.json<StartResponse>({
      ok: true, dry_run: dryRun, would_enqueue: 0, enqueued: 0, skipped_no_email: 0, skipped_suppressed: 0, skipped_merge_tags: 0,
      first_scheduled_for: null, last_scheduled_for: null, inboxes_used: [],
      reason: 'All inboxes are paused or already at their daily cap.',
    });
  }

  // Check domain allowances; filter out any inbox whose domain is over ceiling.
  const allowedInboxes: typeof inboxCapacity = [];
  for (const c of inboxCapacity) {
    const allowance = await checkDomainAllowance(c.inbox.email);
    if (!allowance.allowed) continue;
    allowedInboxes.push(c);
  }

  if (allowedInboxes.length === 0) {
    return NextResponse.json<StartResponse>({
      ok: true, dry_run: dryRun, would_enqueue: 0, enqueued: 0, skipped_no_email: 0, skipped_suppressed: 0, skipped_merge_tags: 0,
      first_scheduled_for: null, last_scheduled_for: null, inboxes_used: [],
      reason: 'All inboxes blocked by domain ceiling. Wait until tomorrow or raise hard_ceiling.',
    });
  }

  const totalCapacity = allowedInboxes.reduce((a, c) => a + c.remaining, 0);

  // Pick prospects: new, have email, have draft, not already queued or sent (UNIQUE constraint covers that)
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
  // Track "virtual last_sent_at" so spacing is respected across the batch we're enqueuing now,
  // not just vs the inbox's DB last_sent_at.
  const inboxNextAt = new Map<string, Date>();

  let firstScheduled: Date | null = null;
  let lastScheduled: Date | null = null;

  for (const p of prospects) {
    if (counters.enqueued >= totalCapacity) break;
    if (!p.email) { counters.skipped_no_email++; continue; }

    if (await isSuppressed(p.email)) {
      if (!dryRun) {
        await sql`UPDATE outreach_prospects SET status='suppressed', updated_at=now() WHERE id=${p.id}`;
      }
      counters.skipped_suppressed++;
      continue;
    }

    const audit = auditMergeTags({ subject: p.draft_subject ?? '', body: p.draft_body ?? '' });
    if (!audit.ok) { counters.skipped_merge_tags++; continue; }

    // Round-robin: pick inbox with most remaining capacity that still has room.
    const bestInbox = allowedInboxes
      .map((c) => ({ c, used: inboxAssigned.get(c.inbox.id) ?? 0 }))
      .filter(({ c, used }) => used < c.remaining)
      .sort((a, b) => b.c.remaining - b.used - (a.c.remaining - a.used))[0];
    if (!bestInbox) break;

    const priorNext = inboxNextAt.get(bestInbox.c.inbox.id);
    const baseTime = priorNext
      ? new Date(priorNext.getTime() + randomSpacingSeconds(bestInbox.c.inbox.min_spacing_seconds, bestInbox.c.inbox.max_spacing_seconds) * 1000)
      : await computeNextScheduledTime(bestInbox.c.inbox);

    if (!dryRun) {
      const enqueued = await enqueueSend({
        prospect_id: p.id,
        inbox_id: bestInbox.c.inbox.id,
        campaign_id: p.campaign_id,
        follow_up_number: 0,
        scheduled_for: baseTime,
      });
      if (!enqueued) continue; // UNIQUE collision (already queued by another request)
      await sql`UPDATE outreach_prospects SET status='queued', updated_at=now() WHERE id=${p.id}`;
    }
    counters.enqueued++;
    inboxAssigned.set(bestInbox.c.inbox.id, (inboxAssigned.get(bestInbox.c.inbox.id) ?? 0) + 1);
    inboxNextAt.set(bestInbox.c.inbox.id, baseTime);
    if (!firstScheduled || baseTime < firstScheduled) firstScheduled = baseTime;
    if (!lastScheduled || baseTime > lastScheduled) lastScheduled = baseTime;
  }

  // Real-run only: signal the worker + kick it for immediate pickup.
  if (!dryRun && counters.enqueued > 0) {
    await sql`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('outreach_start_now', to_jsonb(now()::text), now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
    // Kick the worker on the LOCAL dev server, not production. NEXT_PUBLIC_SITE_URL
    // points at the public marketing site (where the worker doesn't run).
    const base = process.env.LOCAL_WORKER_URL || 'http://localhost:3001';
    fetch(`${base}/api/cron/outreach-send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    }).catch(() => {});
  }

  return NextResponse.json<StartResponse>({
    ok: true,
    dry_run: dryRun,
    would_enqueue: counters.enqueued,
    enqueued: dryRun ? 0 : counters.enqueued,
    skipped_no_email: counters.skipped_no_email,
    skipped_suppressed: counters.skipped_suppressed,
    skipped_merge_tags: counters.skipped_merge_tags,
    first_scheduled_for: firstScheduled?.toISOString() ?? null,
    last_scheduled_for: lastScheduled?.toISOString() ?? null,
    inboxes_used: allowedInboxes.map((c) => ({
      email: c.inbox.email,
      assigned: inboxAssigned.get(c.inbox.id) ?? 0,
      remaining_capacity: c.remaining - (inboxAssigned.get(c.inbox.id) ?? 0),
    })),
    reason: counters.enqueued === 0 ? 'No eligible prospects (all queued, sent, suppressed, or missing drafts).' : undefined,
  });
  } finally {
    if (lockAcquired) {
      try { await releaseBuildLock(); } catch { /* lock will TTL out */ }
    }
  }
}
