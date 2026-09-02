import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(request.url);
  const cls = url.searchParams.get('class'); // hot, warm, cold, remove, ooo, uncertain

  const classClause = cls && ['hot', 'warm', 'cold', 'remove', 'ooo', 'uncertain', 'bounce'].includes(cls)
    ? sql`AND e.reply_classification = ${cls}`
    : sql``;

  const rows = await sql`
    SELECT
      e.id AS event_id,
      e.send_id,
      e.created_at,
      e.reply_body,
      e.reply_classification,
      e.reply_match_confidence,
      e.raw_headers,
      s.subject AS original_subject,
      s.sent_at,
      s.follow_up_number,
      p.id AS prospect_id,
      p.name AS prospect_name,
      p.email AS prospect_email,
      p.status AS prospect_status
    FROM outreach_events e
    JOIN outreach_sends s ON s.id = e.send_id
    JOIN outreach_prospects p ON p.id = s.prospect_id
    WHERE e.event_type = 'reply'
      ${classClause}
    ORDER BY e.created_at DESC
    LIMIT 200
  `;

  const byClass = await sql<Array<{ reply_classification: string | null; n: number }>>`
    SELECT reply_classification, COUNT(*)::int AS n
    FROM outreach_events
    WHERE event_type = 'reply'
    GROUP BY reply_classification
    ORDER BY n DESC
  `;

  return NextResponse.json({ replies: rows, by_class: byClass });
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const { action, event_id, classification } = body as {
    action?: string; event_id?: string; classification?: string;
  };

  if (action === 'reclassify' && event_id && classification) {
    if (!['hot', 'warm', 'cold', 'remove', 'ooo', 'bounce', 'uncertain'].includes(classification)) {
      return NextResponse.json({ error: 'Invalid classification' }, { status: 400 });
    }
    await sql`
      UPDATE outreach_events
      SET reply_classification = ${classification}
      WHERE id = ${event_id}::uuid AND event_type = 'reply'
    `;
    return NextResponse.json({ ok: true });
  }

  if (action === 'confirm_fuzzy' && event_id) {
    await sql`
      UPDATE outreach_events
      SET reply_match_confidence = 'manual'
      WHERE id = ${event_id}::uuid AND event_type = 'reply'
    `;
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
