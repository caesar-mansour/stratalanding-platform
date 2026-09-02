import { NextRequest, NextResponse } from 'next/server';
import { timingSafeCompare } from '@/lib/security/sanitize';
import sql from '@/lib/db';
import { getActiveInboxes, isOutreachPaused } from '@/lib/outreach/db';
import { pollInbox, buildUpdatedNotes, type InboundMessage } from '@/lib/outreach/imap-poller';
import { matchReply } from '@/lib/outreach/reply-matcher';
import { parseBounce } from '@/lib/outreach/bounce-parser';
import { classifyReply } from '@/lib/outreach/classify';
import { addSuppression } from '@/lib/suppressions';
import { notifyOnNewReply } from '@/lib/outreach/notify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// IMAP + GPT per message — 60s to be safe. Works on Netlify Background Functions.
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization');
  return !!process.env.CRON_SECRET && timingSafeCompare(auth ?? '', `Bearer ${process.env.CRON_SECRET}`);
}

interface Summary {
  inboxes_polled: number;
  messages_fetched: number;
  matched: number;
  unmatched: number;
  bounces_parsed: number;
  hot: number;
  warm: number;
  cold: number;
  remove: number;
  ooo: number;
  suppressed: number;
  errors: string[];
}

export async function GET(request: NextRequest) { return handle(request); }
export async function POST(request: NextRequest) { return handle(request); }

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (await isOutreachPaused()) {
    return NextResponse.json({ ok: true, paused: true });
  }

  const summary: Summary = {
    inboxes_polled: 0, messages_fetched: 0, matched: 0, unmatched: 0,
    bounces_parsed: 0, hot: 0, warm: 0, cold: 0, remove: 0, ooo: 0, suppressed: 0, errors: [],
  };

  const inboxes = (await getActiveInboxes()).filter((i) => i.active);

  for (const inbox of inboxes) {
    summary.inboxes_polled++;

    const result = await pollInbox(inbox, async (msg: InboundMessage) => {
      summary.messages_fetched++;

      // Step 1: quick bounce check (from/subject/body heuristics)
      const bounce = parseBounce({
        from: msg.headers.from,
        subject: msg.headers.subject,
        body: msg.bodyText,
      });

      // Step 2: match to a send (try even for bounces so we can surface per-prospect)
      const match = await matchReply(msg.headers);

      if (bounce.is_bounce) {
        summary.bounces_parsed++;
        // SECURITY (audit F63): only act on a bounce that matches a REAL send. A forged
        // mailer-daemon message (anyone can email the inbox) matches no send, so it can no
        // longer suppress arbitrary addresses. We suppress the matched prospect's OWN email
        // — never an attacker-supplied Final-Recipient header.
        if (match) {
          await sql`
            INSERT INTO outreach_events (user_id, send_id, event_type, reply_body, raw_headers)
            VALUES (
              (SELECT user_id FROM outreach_sends WHERE id = ${match.send_id}),
              ${match.send_id}, 'bounce', ${bounce.diagnostic ?? null}, ${sql.json({
              status_code: bounce.status_code,
              kind: bounce.kind,
              failed_recipient: bounce.failed_recipient,
              from: msg.headers.from,
              subject: msg.headers.subject,
            } as never)}::jsonb)
          `;
          await sql`UPDATE outreach_sends SET bounced = true, bounced_at = now() WHERE id = ${match.send_id}`;
          await sql`
            UPDATE outreach_prospects
            SET status = 'bounced', bounced_at = now(), updated_at = now()
            WHERE id = ${match.prospect_id}
          `;
          if (bounce.kind === 'hard') {
            const [bouncedProspect] = await sql<Array<{ email: string | null }>>`
              SELECT email FROM outreach_prospects WHERE id = ${match.prospect_id} LIMIT 1
            `;
            if (bouncedProspect?.email) {
              await addSuppression({
                email: bouncedProspect.email,
                reason: 'hard_bounce',
                source: 'imap_poller',
                notes: `${bounce.status_code ?? ''} ${bounce.diagnostic ?? ''}`.trim() || undefined,
              });
              summary.suppressed++;
            }
          }
        }
        return;
      }

      if (!match) {
        summary.unmatched++;
        return;
      }
      summary.matched++;

      // Step 3: classify
      const [send] = await sql<Array<{ subject: string; body_text: string; prospect_id: string }>>`
        SELECT subject, body_text, prospect_id FROM outreach_sends WHERE id = ${match.send_id}
      `;
      const [prospect] = await sql<Array<{ name: string; email: string | null }>>`
        SELECT name, email FROM outreach_prospects WHERE id = ${match.prospect_id}
      `;
      const classification = await classifyReply({
        originalSubject: send?.subject ?? '',
        originalBody: send?.body_text ?? '',
        replyBody: msg.bodyText,
        prospectName: prospect?.name ?? undefined,
      });

      // Dedupe: if we already have a reply event for this send with same body prefix, skip insert.
      const bodyKey = msg.bodyText.slice(0, 500);
      const [existing] = await sql<Array<{ id: string }>>`
        SELECT id FROM outreach_events
        WHERE send_id = ${match.send_id}
          AND event_type = 'reply'
          AND LEFT(COALESCE(reply_body, ''), 500) = ${bodyKey}
        LIMIT 1
      `;
      if (existing) return; // already logged

      await sql`
        INSERT INTO outreach_events (user_id, send_id, event_type, reply_body, reply_classification, reply_match_confidence, raw_headers)
        VALUES (
          (SELECT user_id FROM outreach_sends WHERE id = ${match.send_id}),
          ${match.send_id}, 'reply',
          ${msg.bodyText.slice(0, 8000)},
          ${classification.confidence >= 0.6 ? classification.classification : 'uncertain'},
          ${match.confidence},
          ${sql.json({
            from: msg.headers.from,
            subject: msg.headers.subject,
            date: msg.headers.date?.toISOString() ?? null,
            rationale: classification.rationale,
            classifier_confidence: classification.confidence,
          } as never)}::jsonb
        )
      `;
      await sql`UPDATE outreach_sends SET replied = true, replied_at = COALESCE(replied_at, now()) WHERE id = ${match.send_id}`;
      await sql`
        UPDATE outreach_prospects
        SET status = 'replied', replied_at = COALESCE(replied_at, now()), updated_at = now()
        WHERE id = ${match.prospect_id}
      `;

      // Count by category
      const c = classification.confidence >= 0.6 ? classification.classification : 'uncertain';

      // Fire-and-forget notification email. Failures don't block the poll.
      if (prospect?.email) {
        void notifyOnNewReply({
          prospectName: prospect.name ?? prospect.email,
          prospectEmail: prospect.email,
          classification: c,
          replyBodyPreview: msg.bodyText.slice(0, 600),
          originalSubject: send?.subject ?? '(no subject)',
          sendId: match.send_id,
        }).catch((err) => console.error('[notify] uncaught:', err));
      }

      if (c === 'hot') summary.hot++;
      else if (c === 'warm') summary.warm++;
      else if (c === 'cold') summary.cold++;
      else if (c === 'remove') summary.remove++;
      else if (c === 'ooo') summary.ooo++;

      // Action on specific classifications
      if (c === 'remove' && prospect?.email) {
        await addSuppression({
          email: prospect.email,
          reason: 'reply_remove_request',
          source: 'imap_poller_classifier',
          notes: `Classified: ${classification.rationale}`,
        });
        await sql`
          UPDATE outreach_prospects
          SET status = 'suppressed', unsubscribed_at = now(), updated_at = now()
          WHERE id = ${match.prospect_id}
        `;
        summary.suppressed++;
      }

      if (c === 'ooo') {
        // Push out any pending follow-ups for this prospect by +7 days
        await sql`
          UPDATE outreach_send_queue
          SET scheduled_for = scheduled_for + INTERVAL '7 days', updated_at = now()
          WHERE prospect_id = ${match.prospect_id} AND status = 'pending'
        `;
      }
    });

    if (!result.ok) {
      summary.errors.push(`${inbox.label}: ${result.error ?? 'unknown'}`);
      continue;
    }

    // Persist the high-water UID
    if (result.lastUidProcessed > 0) {
      const newNotes = buildUpdatedNotes(inbox, result.lastUidProcessed);
      await sql`UPDATE outreach_inboxes SET notes = ${newNotes} WHERE id = ${inbox.id}`;
    }
  }

  return NextResponse.json({ ok: true, summary });
}
