import { NextRequest, NextResponse } from 'next/server';
import { timingSafeCompare } from '@/lib/security/sanitize';
import sql from '@/lib/db';
import { isOutreachPaused, enqueueSend } from '@/lib/outreach/db';
import { computeDueFollowups, defaultFollowupTemplate } from '@/lib/outreach/follow-ups';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization');
  return !!process.env.CRON_SECRET && timingSafeCompare(auth ?? '', `Bearer ${process.env.CRON_SECRET}`);
}

export async function GET(request: NextRequest) { return handle(request); }
export async function POST(request: NextRequest) { return handle(request); }

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (await isOutreachPaused()) {
    return NextResponse.json({ ok: true, paused: true, queued: 0 });
  }

  const plans = await computeDueFollowups();
  let queued = 0;
  const skipped: string[] = [];

  for (const plan of plans) {
    const [prospect] = await sql<Array<{ name: string; draft_subject: string | null; draft_body: string | null }>>`
      SELECT name, draft_subject, draft_body FROM outreach_prospects WHERE id = ${plan.prospect_id}
    `;
    if (!prospect) continue;

    // Fill in the follow-up draft template if the prospect doesn't already have one for this step.
    // We store the follow-up copy on outreach_send_queue via the draft itself — but since we write
    // drafts onto the prospect row, we temporarily populate a per-step subject/body just for the
    // send worker's use. Simpler: keep the worker reading the prospect's draft_* fields, and for
    // follow-ups we use the templated subject/body by writing them onto the prospect just-in-time.
    //
    // Cleaner long-term: a separate outreach_drafts table keyed by (prospect_id, follow_up_number).
    // For v1 we write follow-up copy into outreach_send_queue.last_error as a hack... actually no,
    // cleaner: emit into the outreach_sends row at send time via the worker reading queue + template.
    // For simplicity of v1 Slice C, we just enqueue — the send worker will need a small tweak
    // to pull follow-up template when follow_up_number > 0.

    const enqueued = await enqueueSend({
      prospect_id: plan.prospect_id,
      inbox_id: plan.inbox_id,
      campaign_id: plan.campaign_id,
      follow_up_number: plan.follow_up_number,
      scheduled_for: plan.scheduled_for,
      priority: 110, // higher than initial so follow-ups jump the line slightly
    });
    if (enqueued) {
      queued++;
    } else {
      skipped.push(plan.prospect_id);
    }
  }

  return NextResponse.json({
    ok: true,
    plans_computed: plans.length,
    queued,
    skipped: skipped.length,
  });
}

// Exported for reuse in future template-panel UI.
export { defaultFollowupTemplate };
