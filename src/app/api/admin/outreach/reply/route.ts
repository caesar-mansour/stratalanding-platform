import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import sql from '@/lib/db';
import { getInboxById, getProspectById } from '@/lib/outreach/db';
import { buildEmail } from '@/lib/outreach/build-email';
import { sendOutreachEmail } from '@/lib/outreach/send-adapter';
import { isSuppressed } from '@/lib/suppressions';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Reply to an inbound reply event — from the platform, not Gmail.
 *
 * Body: { event_id, body, force_suppressed? }
 *
 * Flow:
 *   1. Load inbound event → find the outreach_sends row we're responding to
 *   2. Build a properly-threaded reply (In-Reply-To + References headers)
 *   3. Send via the same inbox that sent the original (keeps the thread clean)
 *   4. Mark the inbound event as handled
 *   5. Optionally skip suppression check (force_suppressed=true)
 */
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { event_id?: string; body?: string; force_suppressed?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventId = body.event_id;
  const replyText = body.body;
  if (!eventId || typeof eventId !== 'string') {
    return NextResponse.json({ error: 'event_id required' }, { status: 400 });
  }
  if (!replyText || typeof replyText !== 'string' || replyText.trim().length === 0) {
    return NextResponse.json({ error: 'body required (non-empty)' }, { status: 400 });
  }
  if (replyText.length > 20_000) {
    return NextResponse.json({ error: 'body too long (max 20,000 chars)' }, { status: 400 });
  }

  try {
    // 1. Load the inbound event + its associated send row
    const [row] = await sql<Array<{
      event_id: string;
      event_type: string;
      handled_at: string | null;
      send_id: string;
      message_id: string;
      original_subject: string;
      prospect_id: string;
      inbox_id: string;
    }>>`
      SELECT
        e.id AS event_id,
        e.event_type,
        e.handled_at,
        s.id AS send_id,
        s.message_id,
        s.subject AS original_subject,
        s.prospect_id,
        s.inbox_id
      FROM outreach_events e
      JOIN outreach_sends s ON s.id = e.send_id
      WHERE e.id = ${eventId}::uuid
      LIMIT 1
    `;

    if (!row) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (row.event_type !== 'reply') {
      return NextResponse.json({ error: 'Event is not a reply' }, { status: 400 });
    }

    // 2. Load inbox + prospect
    const [inbox, prospect] = await Promise.all([
      getInboxById(row.inbox_id),
      getProspectById(row.prospect_id),
    ]);
    if (!inbox) return NextResponse.json({ error: 'Inbox not found' }, { status: 500 });
    if (!prospect?.email) {
      return NextResponse.json({ error: 'Prospect has no email' }, { status: 400 });
    }

    // 3. Suppression check (bypassable with force_suppressed flag)
    if (!body.force_suppressed) {
      if (await isSuppressed(prospect.email)) {
        return NextResponse.json({
          error: 'Prospect is on the suppression list. Pass force_suppressed=true to override.',
          code: 'SUPPRESSED',
        }, { status: 409 });
      }
    }

    // 4. Build the reply email
    const subject = dedupeReSubject(row.original_subject);
    const trackingToken = crypto.randomUUID();
    const replyToToken = crypto.randomUUID();

    const built = buildEmail({
      toEmail: prospect.email,
      toName: prospect.name,
      fromEmail: inbox.email,
      fromDisplay: inbox.display_name,
      subject,
      bodyText: replyText.trim(),
      trackingToken,
      replyToToken,
      inReplyToMessageId: row.message_id,
      referencesMessageIds: [row.message_id],
    });

    // 5. Send via the same adapter path the main worker uses
    const result = await sendOutreachEmail(built, inbox);
    if (!result.ok) {
      return NextResponse.json({
        error: result.error ?? 'Send failed',
        retryable: result.retryable === true,
      }, { status: 502 });
    }

    // 6. Mark the inbound event as handled
    await sql`
      UPDATE outreach_events
      SET handled_at = now(), handled_by = 'admin'
      WHERE id = ${eventId}::uuid AND handled_at IS NULL
    `;

    // 7. (Optional for later: record the outbound reply as a new event)
    // For v1, Gmail's Sent folder is the archive.

    return NextResponse.json({
      ok: true,
      message_id: built.messageId,
      to: prospect.email,
      from: inbox.email,
      subject,
    });
  } catch (err) {
    console.error('[reply] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * "Re: Foo" → "Re: Foo"
 * "Re: Re: Foo" → "Re: Foo"
 * "Foo" → "Re: Foo"
 * Strips all leading "Re:/Fwd:/etc." variants (case-insensitive).
 */
function dedupeReSubject(original: string): string {
  const stripped = original.replace(/^(\s*(re|fwd|fw|aw|r|wg|sv|tr):\s*)+/gi, '').trim();
  return `Re: ${stripped || '(no subject)'}`;
}
