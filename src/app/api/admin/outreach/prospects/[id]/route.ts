import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const [prospect] = await sql`
      SELECT p.*, c.location AS campaign_location, c.niche AS campaign_niche
      FROM outreach_prospects p
      LEFT JOIN outreach_campaigns c ON c.id = p.campaign_id
      WHERE p.id = ${id}::uuid
      LIMIT 1
    `;
    if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const sends = await sql`
      SELECT id, subject, follow_up_number, sent_at, first_open_at, first_click_at,
             open_count_real, open_count_raw, click_count, replied, bounced, unsubscribed,
             message_id, inbox_id
      FROM outreach_sends
      WHERE prospect_id = ${id}::uuid
      ORDER BY sent_at ASC
    `;

    const events = await sql`
      SELECT e.id, e.send_id, e.event_type, e.open_type, e.url,
             e.country, e.city, e.reply_classification, e.reply_match_confidence,
             e.reply_body, e.created_at
      FROM outreach_events e
      JOIN outreach_sends s ON s.id = e.send_id
      WHERE s.prospect_id = ${id}::uuid
      ORDER BY e.created_at DESC
      LIMIT 200
    `;

    return NextResponse.json({ prospect, sends, events });
  } catch (err) {
    console.error('prospect detail error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
